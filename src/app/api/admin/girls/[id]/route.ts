import { NextRequest, NextResponse } from 'next/server';
import pool, { getPool } from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { sanitizeLimitedHtml } from '@/lib/sanitizeLimitedHtml';
import { sanitizePlainText } from '@/lib/sanitizePlainText';

// GET - Get single girl
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { id } = await params;
    const girlId = parseInt(id);

    if (isNaN(girlId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Fetch girl
    const [girlRows] = await pool.execute(
      `SELECT * FROM girls WHERE id = ?`,
      [girlId]
    ) as any[];

    if (!girlRows || girlRows.length === 0) {
      return NextResponse.json(
        { error: 'Girl not found' },
        { status: 404 }
      );
    }

    const row = girlRows[0];

    // STEP 1: PROVE DATABASE TRUTH - Log counts before fetch
    const [countTotal] = await pool.execute(
      `SELECT COUNT(*) as total FROM girlinfos WHERE girlid = ?`,
      [girlId]
    ) as any[];
    const totalCount = parseInt(countTotal[0]?.total || '0');
    
    const [countWithOrd] = await pool.execute(
      `SELECT COUNT(*) as total FROM girlinfos WHERE girlid = ? AND ord IS NOT NULL`,
      [girlId]
    ) as any[];
    const withOrdCount = parseInt(countWithOrd[0]?.total || '0');
    
    console.log(`[Admin API GET] STEP 1 - Database truth for girl ${girlId}:`);
    console.log(`  Total rows in DB: ${totalCount}`);
    console.log(`  Rows with ord: ${withOrdCount}`);
    console.log(`  Rows without ord: ${totalCount - withOrdCount}`);
    
    // STEP 2: FETCH ALL ROWS - No filtering, no dropping
    // CRITICAL: Use COALESCE to handle NULL ord, never filter by ord existence
    const [timelineRows] = await pool.execute(
      `SELECT id, shrttext as date, lngtext as event, ord 
       FROM girlinfos 
       WHERE girlid = ? 
       ORDER BY COALESCE(ord, 999999) ASC, id ASC`,
      [girlId]
    ) as any[];
    
    // STEP 2 VERIFICATION: Raw rows length MUST equal DB count
    const fetchedCount = Array.isArray(timelineRows) ? timelineRows.length : 0;
    console.log(`[Admin API GET] STEP 2 - Fetch verification:`);
    console.log(`  Fetched rows: ${fetchedCount}`);
    console.log(`  DB count: ${totalCount}`);
    
    if (fetchedCount !== totalCount) {
      console.error(`[Admin API GET] CRITICAL: Fetch mismatch! DB has ${totalCount} rows but query returned ${fetchedCount}`);
    } else {
      console.log(`  ✅ Fetch matches DB count`);
    }

    // Fetch links and books from girllinks table
    // tp = 0 means regular link, tp = 1 means recommended book
    let allLinks: any[] = [];
    try {
      const [linkResults] = await pool.execute(
        `SELECT id, girlid, caption, lnk, ord, tp FROM girllinks WHERE girlid = ? ORDER BY ord ASC`,
        [girlId]
      ) as any[];
      allLinks = Array.isArray(linkResults) ? linkResults : [];
    } catch (e) {
      // Table might not exist
      allLinks = [];
    }

    // Separate links (tp = 0) from books (tp = 1)
    // NOTE: tp can come back as string from pg, so normalize first.
    const links = allLinks
      .filter((item: any) => {
        const tp = item.tp === null || item.tp === undefined ? null : Number(item.tp);
        return tp === 0 || tp === null;
      })
      .map((item: any) => ({
        id: Number(item.id) || 0,
        text: String(item.caption || ''),
        url: String(item.lnk || ''),
        ord: Number(item.ord) || 0,
      }));

    const books = allLinks
      .filter((item: any) => Number(item.tp) === 1)
      .map((item: any) => ({
        id: Number(item.id) || 0,
        title: String(item.caption || ''),
        url: String(item.lnk || ''),
        ord: Number(item.ord) || 0,
      }));

    // Fetch images - match frontend filtering exactly: mytp IN (3, 4, 5) with valid paths and dimensions
    // Include order_num for gallery images
    // CRITICAL: Order gallery images (mytp=4) by order_num, others by id
    const [imageRows] = await pool.execute(
      `SELECT id, path, width, height, mytp, description, order_num
       FROM images 
       WHERE girlid = ? 
         AND mytp IN (3, 4, 5)
         AND path IS NOT NULL 
         AND path != ''
         AND width > 0 
         AND height > 0
       ORDER BY 
         CASE WHEN mytp = 4 THEN COALESCE(order_num, 999999) ELSE 999998 END ASC,
         id ASC`,
      [girlId]
    ) as any[];
    
    // Also fetch HQ images with description and file size (sz)
    const [hqImageRows] = await pool.execute(
      `SELECT id, path, width, height, description, sz
       FROM images 
       WHERE girlid = ? 
         AND mytp = 5
         AND path IS NOT NULL 
         AND path != ''
       ORDER BY id ASC`,
      [girlId]
    ) as any[];

    // Separate gallery and HQ images
    const galleryImages = imageRows.filter((img: any) => img.mytp === 4);
    // Use hqImageRows for HQ images to get description field
    const hqImages = hqImageRows || [];

    // Create a map of HQ images by matching ID pattern
    const hqMap = new Map();
    galleryImages.forEach((gallery: any) => {
      const galleryId = Number(gallery.id);
      let hq = hqImages.find((hq: any) => Number(hq.id) === galleryId - 1);
      if (!hq) {
        hq = hqImages.find((hq: any) => Number(hq.id) === galleryId + 1);
      }
      if (hq) {
        hqMap.set(gallery.id, hq);
      }
    });

    // Helper function to convert database paths to Supabase Storage URLs
    const getStorageUrl = (path: string | null | undefined): string => {
      if (!path) return '';
      if (path.startsWith('http')) return path; // Already a URL
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        // Fallback to local path if Supabase URL not set
        return path.startsWith('/') ? path : `/${path}`;
      }
      
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `${supabaseUrl}/storage/v1/object/public/glamourgirls_images/${cleanPath}`;
    };

    // Format images for the form
    const formattedImages = galleryImages.map((img: any) => {
      const imgPath = String(img.path || '');
      const hqImage = hqMap.get(img.id);
      
      // Handle order_num field - PostgreSQL returns it as order_num, check both variations
      const orderNumValue = img.order_num !== null && img.order_num !== undefined 
        ? img.order_num 
        : (img.orderNum !== null && img.orderNum !== undefined ? img.orderNum : null);
      const orderNum = orderNumValue !== null ? Number(orderNumValue) : null;
      
      // Calculate HQ sizeMB from sz field (stored bytes)
      let hqSizeMB: number | null = null;
      if (hqImage && hqImage.sz !== null && hqImage.sz !== undefined && hqImage.sz !== '') {
        const parsed = Number(hqImage.sz);
        if (!isNaN(parsed) && parsed > 0 && Number.isFinite(parsed)) {
          hqSizeMB = parseFloat((parsed / (1024 * 1024)).toFixed(2));
        }
      }
      
      return {
        id: Number(img.id) || 0,
        girlId: girlId,
        path: imgPath,
        url: getStorageUrl(imgPath), // Convert to Supabase URL
        width: Number(img.width) || 0,
        height: Number(img.height) || 0,
        description: img.description || null,
        type: Number(img.mytp) || 0,
        orderNum: orderNum,
        hq: hqImage ? {
          id: Number(hqImage.id) || 0,
          width: Number(hqImage.width) || 0,
          height: Number(hqImage.height) || 0,
          sizeMB: hqSizeMB,
          url: getStorageUrl(hqImage.path), // Convert to Supabase URL
          description: hqImage.description || null,
        } : null,
      };
    });

    // Map to form data structure
    const girl = {
      id: row.id,
      name: row.nm,
      firstName: row.firstname,
      lastName: row.familiq,
      middleNames: row.middlenames || '',
      era: row.godini,
      isNew: row.isnew === 2,
      hasNewPhotos: row.isnewpix === 2,
      theirMan: Boolean(row.theirman) === true,
      published: row.published === 2,
      sources: row.sources || '',
      slug: row.slug || '',
      timeline: timelineRows.map((t: any) => ({
        id: t.id ? Number(t.id) : null, // Include DB id for updates
        date: t.date || '',
        event: t.event || '',
        ord: t.ord || 0,
      })),
      links: links,
      books: books,
      images: formattedImages,
      seo: {
        seoTitle: row.seotitle || '',
        seoDescription: row.metadescription || '',
        seoKeywords: row.metakeywords || '',
        h1Title: row.h1title || '',
        introText: row.introtext || '',
        ogTitle: row.ogtitle || '',
        ogDescription: row.ogdescription || '',
        ogImageUrl: row.ogimage || '',
        canonicalUrl: row.canonicalurl || '',
        seoStatus: 'red' as 'red' | 'yellow' | 'green',
        autoGenerated: false,
        lastAutoGenerate: null,
      },
    };

    return NextResponse.json(girl);
  } catch (error) {
    console.error('Error fetching girl:', error);
    return NextResponse.json(
      { error: 'Failed to fetch girl' },
      { status: 500 }
    );
  }
}

// PUT - Update girl
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { id } = await params;
    const girlId = parseInt(id);
    const data = await request.json();
    
    // Validate timeline data structure
    if (data.timeline !== undefined && !Array.isArray(data.timeline)) {
      console.error(`[Admin API] Invalid timeline data for girl ${girlId}:`, typeof data.timeline, data.timeline);
      return NextResponse.json(
        { error: 'Timeline data must be an array' },
        { status: 400 }
      );
    }
    
    // Validate and normalize links/books: no partially filled rows.
    const trim = (v: any) => String(v ?? '').trim();
    const linksIn = Array.isArray(data.links) ? data.links : [];
    const booksIn = Array.isArray(data.books) ? data.books : [];

    const normLinks = linksIn
      .map((l: any) => ({ text: trim(l?.text), url: trim(l?.url) }))
      .filter((l: any) => l.text || l.url);
    const badLinkIdx = normLinks.findIndex((l: any) => (l.text && !l.url) || (!l.text && l.url));

    const normBooks = booksIn
      .map((b: any) => ({ title: trim(b?.title), url: trim(b?.url) }))
      .filter((b: any) => b.title || b.url);
    const badBookIdx = normBooks.findIndex((b: any) => (b.title && !b.url) || (!b.title && b.url));

    if (badLinkIdx !== -1 || badBookIdx !== -1) {
      const msg =
        badLinkIdx !== -1
          ? `Links: row #${badLinkIdx + 1} must include both text and URL.`
          : `Recommended Books: row #${badBookIdx + 1} must include both title and URL.`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Enforce DB varchar(255) constraints to avoid silent insert failures.
    const tooLongLinkIdx = normLinks.findIndex((l: any) => l.text.length > 255 || l.url.length > 255);
    if (tooLongLinkIdx !== -1) {
      return NextResponse.json(
        { error: `Links: row #${tooLongLinkIdx + 1} is too long (max 255 chars for text and URL).` },
        { status: 400 }
      );
    }
    const tooLongBookIdx = normBooks.findIndex((b: any) => b.title.length > 255 || b.url.length > 255);
    if (tooLongBookIdx !== -1) {
      return NextResponse.json(
        { error: `Recommended Books: row #${tooLongBookIdx + 1} is too long (max 255 chars for title and URL).` },
        { status: 400 }
      );
    }


    if (isNaN(girlId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if girl exists
    const [existingRows] = await pool.execute(
      `SELECT * FROM girls WHERE id = ?`,
      [girlId]
    ) as any[];

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { error: 'Girl not found' },
        { status: 404 }
      );
    }

    // Build full name
    // Prefer `name` if explicitly provided (admin can edit full display name directly).
    const fullName =
      String(data?.name || '').trim() ||
      `${data.firstName || ''} ${data.middleNames || ''} ${data.lastName || ''}`.trim();

    // Determine era and theirMan from form data
    // If theirMan is true, set theirman = true, otherwise use era value
    const theirMan = data.theirMan ? true : false;
    const era = data.era || 3;

    const existing = existingRows[0] || {};
    const seo = data?.seo;
    const has = (obj: any, key: string) => obj && Object.prototype.hasOwnProperty.call(obj, key);

    // Use a single transaction for all updates to ensure atomicity
    // This prevents "transaction aborted" errors from partial failures
    const pgPool = getPool();
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      
      // Update girl
      await client.query(
        `UPDATE girls SET
          nm = $1,
          firstname = $2,
          middlenames = $3,
          familiq = $4,
          godini = $5,
          isnew = $6,
          published = $7,
          isnewpix = $8,
          theirman = $9,
          sources = $10,
          fnu = $11,
          fmu = $12,
          slug = $13,
          seotitle = $14,
          metadescription = $15,
          metakeywords = $16,
          ogtitle = $17,
          ogdescription = $18,
          ogimage = $19,
          canonicalurl = $20,
          h1title = $21
         WHERE id = $22`,
        [
          fullName,
          data.firstName || '',
          data.middleNames || '',
          data.lastName || '',
          era,
          data.isNew ? 2 : 1,
          data.published ? 2 : 1,
          data.hasNewPhotos ? 2 : 1,
          theirMan,
          sanitizeLimitedHtml(data.sources || ''),
          (data.firstName?.[0] || '').toUpperCase(),
          (data.middleNames?.[0] || data.firstName?.[0] || '').toUpperCase(),
          data.slug || '',
          has(seo, 'seoTitle') ? (seo?.seoTitle ?? null) : (existing.seotitle ?? null),
          has(seo, 'seoDescription') ? (seo?.seoDescription ?? null) : (existing.metadescription ?? null),
          has(seo, 'seoKeywords') ? (seo?.seoKeywords ?? null) : (existing.metakeywords ?? null),
          has(seo, 'ogTitle') ? (seo?.ogTitle ?? null) : (existing.ogtitle ?? null),
          has(seo, 'ogDescription') ? (seo?.ogDescription ?? null) : (existing.ogdescription ?? null),
          has(seo, 'ogImageUrl') ? (seo?.ogImageUrl ?? null) : (existing.ogimage ?? null),
          has(seo, 'canonicalUrl') ? (seo?.canonicalUrl ?? null) : (existing.canonicalurl ?? null),
          has(seo, 'h1Title') ? (seo?.h1Title ?? null) : (existing.h1title ?? null),
          girlId,
        ]
      );

      // TIMELINE SAVE: Use UPDATE/INSERT logic instead of DELETE/INSERT
      // This preserves existing rows and only updates ord field when reordering
      if (data.timeline && Array.isArray(data.timeline)) {
        console.log(`[Timeline Save] Girl ${girlId}: Received ${data.timeline.length} timeline events`);
        
        // Log incoming payload IDs
        const receivedIds = data.timeline
          .map((e: any) => e.id)
          .filter((id: any) => id !== null && id !== undefined);
        console.log(`[Timeline Save] Received IDs: ${receivedIds.length > 0 ? receivedIds.join(', ') : 'none (all new)'}`);
        
        // Filter out invalid events, but allow ALL events (including new empty ones)
        // This allows users to add a new row and fill it in later
        const validEvents = data.timeline.filter((event: any) => {
          if (!event || typeof event !== 'object') {
            console.warn(`[Admin API] Invalid event in timeline for girl ${girlId}:`, event);
            return false;
          }
          // Include all valid event objects (even if empty)
          // Empty events are allowed - user can fill them in later
          return true;
        });
        
        if (validEvents.length === 0) {
          console.warn(`[Timeline Save] No valid timeline events for girl ${girlId}`);
        } else {
          // Normalize ord values: assign sequential 1...N
          const normalizedEvents = validEvents.map((event: any, index: number) => {
            if (!event || typeof event !== 'object') {
              console.error(`[Admin API] Invalid event at index ${index} for girl ${girlId}:`, event);
              throw new Error(`Invalid event at index ${index}`);
            }
            return {
              id: event.id ? Number(event.id) : null, // Preserve id for UPDATE
              date: event.date || '',
              event: event.event || '',
              ord: index + 1, // Always sequential, no gaps, no duplicates
            };
          });
          
          let updatedCount = 0;
          let insertedCount = 0;
          const payloadIds = new Set<number>(); // Track all IDs that should exist (from payload)
          
          for (let i = 0; i < normalizedEvents.length; i++) {
            const event = normalizedEvents[i];
            try {
              const orderValue = i + 1;
              
              if (event.id !== null && event.id !== undefined && event.id > 0) {
                // UPDATE existing row by id
                const eventId = Number(event.id);
                await client.query(
                  `UPDATE girlinfos 
                   SET shrttext = $1, lngtext = $2, ord = $3 
                   WHERE id = $4 AND girlid = $5`,
                  [
                    sanitizeLimitedHtml(event.date || ''),
                    sanitizeLimitedHtml(event.event || ''),
                    orderValue,
                    eventId,
                    girlId,
                  ]
                );
                updatedCount++;
                payloadIds.add(eventId); // Track this ID as should-exist
              } else {
                // INSERT new row (no id provided or id is null/0)
                // Allow empty date/event for new rows (user can fill in later)
                const insertResult = await client.query(
                  `INSERT INTO girlinfos (girlid, shrttext, lngtext, ord)
                   VALUES ($1, $2, $3, $4)
                   RETURNING id`,
                  [
                    girlId,
                    sanitizeLimitedHtml(event.date || ''),
                    sanitizeLimitedHtml(event.event || ''),
                    orderValue,
                  ]
                );
                const newId = insertResult.rows[0]?.id;
                if (newId) {
                  payloadIds.add(Number(newId)); // Track new ID as should-exist
                }
                insertedCount++;
                console.log(`[Timeline Save] Inserted new event with id=${newId}, ord=${orderValue}`);
              }
            } catch (timelineError: any) {
              console.error(`Error saving timeline event ${i + 1} for girl ${girlId}:`, timelineError);
              throw new Error(`Failed to save timeline event: ${timelineError.message}`);
            }
          }
          
          console.log(`[Timeline Save] Girl ${girlId}: Updated ${updatedCount} events, Inserted ${insertedCount} new events`);
          console.log(`[Timeline Save] Payload IDs: ${Array.from(payloadIds).sort((a, b) => a - b).join(', ') || 'none'}`);
          
          // CRITICAL: NO DELETE LOGIC IN SAVE ENDPOINT
          // Deletes must ONLY happen via DELETE endpoint with specific ID
          // Reordering = UPDATE ord only, never triggers deletes
        }
      } else if (data.timeline !== undefined) {
        // If timeline is explicitly set to null/empty array, log but don't delete
        console.warn(`[Timeline Save] Warning: Timeline data is missing or empty for girl ${girlId}. Existing timeline events will be preserved.`);
        if (data.timeline === null || data.timeline === undefined) {
          console.warn(`Timeline is null/undefined - this might indicate a frontend issue`);
        } else if (Array.isArray(data.timeline) && data.timeline.length === 0) {
          console.warn(`Timeline is an empty array - user may have deleted all events intentionally`);
        }
      }

      // Delete existing links and books, then insert new ones
      // Use PostgreSQL advisory lock to prevent concurrent modifications for this specific girl
      
      // Use advisory lock based on girlId to serialize access to this girl's links
      // This ensures only one transaction can modify links for this girl at a time
      const lockKey = 1000000 + girlId; // Use a high number to avoid conflicts with other locks
      const lockResult = await client.query(`SELECT pg_try_advisory_xact_lock($1) as locked`, [lockKey]);
      if (!lockResult.rows[0]?.locked) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json(
          { error: 'Another operation is in progress. Please wait a moment and try again.' },
          { status: 409 }
        );
      }
      
      // Delete existing links and books for this girl
      // Use a more explicit approach to ensure deletion completes before insertion
      try {
        // First, verify the lock is still held
        const lockCheck = await client.query(`SELECT pg_try_advisory_xact_lock($1) as locked`, [lockKey]);
        if (!lockCheck.rows[0]?.locked) {
          await client.query('ROLLBACK');
          client.release();
          return NextResponse.json(
            { error: 'Lock was released. Please refresh the page and try again.' },
            { status: 409 }
          );
        }
        
        const deleteResult = await client.query(`DELETE FROM girllinks WHERE girlid = $1`, [girlId]);
        console.log(`Deleted ${deleteResult.rowCount} existing links/books for girl ${girlId}`);
        
        // Verify deletion completed
        const verifyDelete = await client.query(`SELECT COUNT(*) as count FROM girllinks WHERE girlid = $1`, [girlId]);
        if (parseInt(verifyDelete.rows[0]?.count || '0') > 0) {
          console.warn(`Warning: Some links/books were not deleted for girl ${girlId}. Count: ${verifyDelete.rows[0]?.count}`);
          // Force delete any remaining entries
          await client.query(`DELETE FROM girllinks WHERE girlid = $1`, [girlId]);
        }
        
        // Ensure sequence is set to a safe value (max existing ID + 1)
        // This prevents conflicts when inserting new records
        try {
          const maxIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM girllinks`);
          const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
          if (maxId > 0) {
            // Set sequence to max_id + 1 to ensure next inserts don't conflict
            await client.query(`SELECT setval('girllinks_id_seq', $1, true)`, [maxId]);
            console.log(`Reset girllinks_id_seq to ${maxId} for girl ${girlId}`);
          }
        } catch (seqError: any) {
          // If sequence doesn't exist or can't be reset, log but continue
          console.warn(`Could not reset sequence: ${seqError.message}`);
        }
      } catch (deleteError: any) {
        // Table might not exist, but continue anyway
        if (!deleteError.message?.includes('does not exist') && !deleteError.message?.includes('relation') && !deleteError.message?.includes('table')) {
          throw deleteError;
        }
      }

      // Insert updated links (tp = 0)
      // Sequence should now be properly set, so we can safely let PostgreSQL auto-generate IDs
      for (let i = 0; i < normLinks.length; i++) {
        const link = normLinks[i];
        if (!link.text || !link.url) continue;
        
        await client.query(
          `INSERT INTO girllinks (girlid, caption, lnk, ord, tp) 
           VALUES ($1, $2, $3, $4, 0)`,
          [girlId, sanitizePlainText(link.text), trim(link.url), i + 1]
        );
      }

      // Insert updated books (tp = 1)
      // Sequence should now be properly set, so we can safely let PostgreSQL auto-generate IDs
      for (let i = 0; i < normBooks.length; i++) {
        const book = normBooks[i];
        if (!book.title || !book.url) continue;
        
        await client.query(
          `INSERT INTO girllinks (girlid, caption, lnk, ord, tp) 
           VALUES ($1, $2, $3, $4, 1)`,
          [girlId, sanitizePlainText(book.title), trim(book.url), i + 1]
        );
      }

      await client.query('COMMIT');
    } catch (error: any) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
        console.error('Error during rollback:', rollbackError);
      }
      // If it's a duplicate key error, provide a more helpful message
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        console.error(`Duplicate key error for girl ${girlId}:`, {
          code: error.code,
          message: error.message,
          detail: error.detail,
          hint: error.hint,
          constraint: error.constraint,
        });
        const isDev = process.env.NODE_ENV !== 'production';
        const errorMsg = isDev 
          ? `A conflict occurred while saving links: ${error.message || error.detail || 'Unknown error'}. Please refresh the page and try again.`
          : 'A conflict occurred while saving links. Please refresh the page and try again.';
        throw new Error(errorMsg);
      }
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ id: girlId, success: true });
  } catch (error) {
    const err = error as any;
    console.error('Error updating girl:', err);
    console.error('Error details:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint,
      stack: err?.stack,
    });
    const isProd = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        error: isProd ? 'Failed to update girl' : `Failed to update girl: ${String(err?.message || err)}`,
        details: !isProd ? {
          code: err?.code,
          detail: err?.detail,
          hint: err?.hint,
        } : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete girl
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { id } = await params;
    const girlId = parseInt(id);

    if (isNaN(girlId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if girl exists
    const [existingRows] = await pool.execute(
      `SELECT * FROM girls WHERE id = ?`,
      [girlId]
    ) as any[];

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { error: 'Girl not found' },
        { status: 404 }
      );
    }

    // Delete timeline events
    await pool.execute(`DELETE FROM girlinfos WHERE girlid = ?`, [girlId]);

    // Delete images (if needed - adjust based on your requirements)
    // await pool.execute(`DELETE FROM images WHERE girlid = ?`, [girlId]);

    // Delete girl
    await pool.execute(`DELETE FROM girls WHERE id = ?`, [girlId]);

    return NextResponse.json({ message: 'Girl deleted successfully' });
  } catch (error) {
    console.error('Error deleting girl:', error);
    return NextResponse.json(
      { error: 'Failed to delete girl' },
      { status: 500 }
    );
  }
}

