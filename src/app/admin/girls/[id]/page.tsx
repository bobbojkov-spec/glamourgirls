import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import GirlEditForm from '@/components/admin/girls/GirlEditForm';
import { Title, Text } from '@/components/admin/AdminTypography';

export default async function EditGirlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const girlId = parseInt(id);

  if (isNaN(girlId)) {
    notFound();
  }

  try {
    // Fetch girl data - simplified query to avoid timeout issues
    const [girlRows] = await pool.execute(
      `SELECT * FROM girls WHERE id = ?`,
      [girlId]
    ) as any[];
    
    // Fetch photo counts separately to avoid complex JOIN
    // HQ count only includes HQ images that have a matching gallery image
    // This ensures HQ count never exceeds gallery count
    const [photoCountRows] = await pool.execute(
      `SELECT 
        COUNT(*) FILTER (WHERE i.mytp = 4) as "photoCount",
        COUNT(*) FILTER (
          WHERE i.mytp = 5 AND EXISTS (
            SELECT 1 FROM images i2 
            WHERE i2.girlid = i.girlid 
              AND i2.mytp = 4 
              AND (i2.id = i.id - 1 OR i2.id = i.id + 1)
          )
        ) as "hqPhotoCount"
       FROM images i WHERE i.girlid = ?`,
      [girlId]
    ) as any[];
    
    if (!girlRows || girlRows.length === 0) {
      notFound();
    }

    const row = girlRows[0];
    // Add photo counts to row
    if (photoCountRows && photoCountRows.length > 0) {
      row.photoCount = parseInt(photoCountRows[0]?.photoCount || '0');
      row.hqPhotoCount = parseInt(photoCountRows[0]?.hqPhotoCount || '0');
    } else {
      row.photoCount = 0;
      row.hqPhotoCount = 0;
    }

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
    
    console.log(`[Admin Edit Page] STEP 1 - Database truth for girl ${girlId}:`);
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
    console.log(`[Admin Edit Page] STEP 2 - Fetch verification:`);
    console.log(`  Fetched rows: ${fetchedCount}`);
    console.log(`  DB count: ${totalCount}`);
    
    if (fetchedCount !== totalCount) {
      console.error(`[Admin Edit Page] CRITICAL: Fetch mismatch! DB has ${totalCount} rows but query returned ${fetchedCount}`);
    } else {
      console.log(`  ✅ Fetch matches DB count`);
    }
    
    if (Array.isArray(timelineRows) && timelineRows.length > 0) {
      console.log(`[Admin Edit Page] First 5 rows:`, timelineRows.slice(0, 5).map((r: any) => ({
        id: r.id,
        ord: r.ord,
        date: (r.date || '').substring(0, 30),
      })));
    } else {
      console.warn(`[Admin Edit Page] No timeline events found for girl ${girlId}`);
    }

    // Fetch images - match frontend filtering exactly: mytp IN (3, 4, 5) with valid paths and dimensions
    // Include sz (file size in bytes) for HQ images and order_num for gallery images
    // CRITICAL: Order gallery images (mytp=4) by order_num, others by id
    const [imageRows] = await pool.execute(
      `SELECT id, path, width, height, mytp, sz, order_num 
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

    // Separate gallery and HQ images
    const galleryImages = imageRows.filter((img: any) => img.mytp === 4);
    const hqImages = imageRows.filter((img: any) => img.mytp === 5);
    
    // Debug: Log first gallery image to check order_num field
    if (galleryImages.length > 0) {
      console.log(`[Admin Edit Page] First gallery image sample:`, {
        id: galleryImages[0].id,
        order_num: galleryImages[0].order_num,
        orderNum: galleryImages[0].orderNum,
        hasOrderNum: 'order_num' in galleryImages[0],
        keys: Object.keys(galleryImages[0]),
      });
    }
    
    // Create a map of HQ images by matching ID pattern
    // HQ images are typically galleryImageId - 1 or galleryImageId + 1
    // Also try filename pattern matching as fallback
    const hqMap = new Map();
    
    // First, try ID-based matching (more reliable)
    galleryImages.forEach((gallery: any) => {
      const galleryId = Number(gallery.id);
      // Try galleryId - 1 first (most common pattern)
      let hq = hqImages.find((hq: any) => Number(hq.id) === galleryId - 1);
      // If not found, try galleryId + 1
      if (!hq) {
        hq = hqImages.find((hq: any) => Number(hq.id) === galleryId + 1);
      }
      // If still not found, try filename pattern matching as fallback
      if (!hq && gallery.path) {
        const galleryBaseName = gallery.path.replace(/\.(jpg|png|jpeg)/i, '').replace(/\/\d+\//, '/');
        hq = hqImages.find((hq: any) => {
          if (!hq.path) return false;
          const hqBaseName = hq.path.replace(/_hq\.(jpg|png|jpeg)/i, '').replace(/\.(jpg|png|jpeg)/i, '').replace(/\/\d+\//, '/');
          return galleryBaseName.includes(hqBaseName) || hqBaseName.includes(galleryBaseName);
        });
      }
      if (hq) {
        hqMap.set(gallery.id, hq);
      }
    });

    // Include all gallery images (mytp = 4) - they're all in Supabase Storage now
    // No need to filter by path since all images should be valid
    const validImages = [];
    for (const img of galleryImages) {
      if (!img.path) continue;
      
      const pathStr = String(img.path || '');
      
      // Include all images - they're all valid if they're in the database
      // Only skip if path is completely empty (already checked above)
      
      // Find associated HQ image
      const hqImage = hqMap.get(img.id);
      let hqInfo = null;
      
      if (hqImage && hqImage.path) {
        // HQ images are in Supabase Storage (images_raw bucket or public bucket)
        const hqPathStr = String(hqImage.path || '');
        // Use actual file size from sz column (stored bytes), not estimated from dimensions
        // sz is stored as varchar in PostgreSQL, so handle string conversion safely
        let hqFileBytes: number | null = null;
        if (hqImage.sz !== null && hqImage.sz !== undefined && hqImage.sz !== '') {
          const parsed = Number(hqImage.sz);
          if (!isNaN(parsed) && parsed > 0 && Number.isFinite(parsed)) {
            hqFileBytes = parsed;
          }
        }
        // Convert bytes to MB: bytes / (1024 * 1024), show 2 decimals
        // If sz is null/0/missing/invalid, show null (will display as "—" in UI)
        const sizeMB = hqFileBytes !== null
          ? parseFloat((hqFileBytes / (1024 * 1024)).toFixed(2))
          : null;
        
        hqInfo = {
          id: Number(hqImage.id) || 0,
          width: Number(hqImage.width) || 0,
          height: Number(hqImage.height) || 0,
          sizeMB: sizeMB,
          url: hqPathStr,
        };
      }
      
      // Handle order_num field - PostgreSQL returns it as order_num, but check both variations
      const orderNumValue = img.order_num !== null && img.order_num !== undefined 
        ? img.order_num 
        : (img.orderNum !== null && img.orderNum !== undefined ? img.orderNum : null);
      const orderNum = orderNumValue !== null ? Number(orderNumValue) : null;
      
      validImages.push({
        id: Number(img.id) || 0,
        path: pathStr,
        width: Number(img.width) || 0,
        height: Number(img.height) || 0,
        mytp: Number(img.mytp) || 0,
        orderNum: orderNum,
        order_num: orderNum, // Keep both for compatibility
        hq: hqInfo ? {
          id: Number(hqInfo.id) || 0,
          width: Number(hqInfo.width) || 0,
          height: Number(hqInfo.height) || 0,
          sizeMB: hqInfo.sizeMB !== null && hqInfo.sizeMB !== undefined ? Number(hqInfo.sizeMB) : null,
          url: String(hqInfo.url || ''),
        } : null,
      });
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

    // Generate slug from firstname and familiq (same as list page)
    const slug = `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Use the same headshot API route as the frontend (can generate if missing)
    // This ensures consistency and handles headshots that are generated on-the-fly
    // NOTE: The headshot endpoint uses long-lived caching headers.
    // Add a cache-buster so admin immediately sees new uploads after refresh.
    const headshotUrl = `/api/actresses/${girlId}/headshot?v=${Date.now()}`;
    const headshot2Url = `/api/actresses/${girlId}/headshot2?v=${Date.now()}`;

    // Map to form data structure - ensure all values are serializable
    const girl = {
      id: Number(row.id),
      name: String(row.nm || ''),
      firstName: String(row.firstname || ''),
      lastName: String(row.familiq || ''),
      middleNames: String(row.middlenames || ''),
      slug: slug,
      era: Number(row.theirman === 1 ? 3 : row.godini || 3), // Default to 50s if "Their Men" is selected
      isNew: Boolean(row.isnew === 2),
      hasNewPhotos: Boolean(row.isnewpix === 2),
      theirMan: Boolean(row.theirman === 1),
      published: Boolean(row.published === 2),
      sources: String(row.sources || ''),
      timeline: (() => {
        if (!Array.isArray(timelineRows)) {
          console.warn(`[Admin Edit Page] timelineRows is not an array:`, typeof timelineRows, timelineRows);
          return [];
        }
        console.log(`[Admin Edit Page] Raw timelineRows.length: ${timelineRows.length}`);
        console.log(`[Admin Edit Page] First 3 raw rows:`, JSON.stringify(timelineRows.slice(0, 3), null, 2));
        
        // Log warning if any rows have NULL ord (should be fixed by migration)
        const nullOrdCount = timelineRows.filter((t: any) => t.ord === null || t.ord === undefined).length;
        if (nullOrdCount > 0) {
          console.warn(`[Admin Edit Page] WARNING: ${nullOrdCount} timeline events have NULL ord values for girl ${girlId}. Run migration script to fix.`);
        }
        
        // Ensure we process ALL rows - no filtering
        const mapped = timelineRows.map((t: any, index: number) => {
          // If ord is NULL, use index + 1 as fallback (will be normalized on save)
          const ord = t.ord !== null && t.ord !== undefined ? Number(t.ord) : (index + 1);
          const event = {
            id: t.id ? Number(t.id) : null, // Include DB id for updates
            date: String(t.date || ''),
            event: String(t.event || ''),
            ord: ord > 0 ? ord : (index + 1),
          };
          return event;
        });
        
        console.log(`[Admin Edit Page] Mapped ${mapped.length} timeline events for girl ${girlId} (raw rows: ${timelineRows.length})`);
        console.log(`[Admin Edit Page] First 3 mapped events:`, JSON.stringify(mapped.slice(0, 3), null, 2));
        
        if (mapped.length !== timelineRows.length) {
          console.error(`[Admin Edit Page] WARNING: Lost ${timelineRows.length - mapped.length} events during mapping!`);
        }
        
        // Verify all events have valid data
        const invalidEvents = mapped.filter((e, idx) => !e.date && !e.event);
        if (invalidEvents.length > 0) {
          console.warn(`[Admin Edit Page] Found ${invalidEvents.length} events with no date or event text`);
        }
        
        return mapped;
      })(),
      images: validImages.map((img: any) => {
        const imgPath = String(img.path || '');
        return {
          id: Number(img.id) || 0, // Ensure it's a number, not BigInt
          girlId: Number(girlId),
          path: imgPath,
          url: imgPath ? (imgPath.startsWith('/') ? imgPath : `/${imgPath}`) : '',
          width: Number(img.width) || 0,
          height: Number(img.height) || 0,
          type: Number(img.mytp) || 0,
          orderNum: img.orderNum !== null && img.orderNum !== undefined ? Number(img.orderNum) : null,
          hq: img.hq && typeof img.hq === 'object' ? {
            id: Number(img.hq.id) || 0,
            width: Number(img.hq.width) || 0,
            height: Number(img.hq.height) || 0,
            sizeMB: img.hq.sizeMB !== null && img.hq.sizeMB !== undefined ? Number(img.hq.sizeMB) : null,
            url: String(img.hq.url || ''),
          } : null,
        };
      }),
      links: links.map((link: any) => ({
        id: Number(link.id) || 0,
        text: String(link.text || ''),
        url: String(link.url || link.link || ''),
        ord: Number(link.ord) || 0,
      })),
      books: books.map((book: any) => ({
        id: Number(book.id) || 0,
        title: String(book.title || ''),
        url: String(book.url || book.link || ''),
        ord: Number(book.ord) || 0,
      })),
      photoCount: Number(row.photoCount) || 0,
      hqPhotoCount: Number(row.hqPhotoCount) || 0,
      headshotUrl: headshotUrl ? String(headshotUrl) : null,
      headshot2Url: headshot2Url ? String(headshot2Url) : null,
      seo: {
        seoTitle: String(row.seotitle || ''),
        seoDescription: String(row.metadescription || ''),
        seoKeywords: String(row.metakeywords || ''),
        h1Title: String(row.h1title || ''),
        introText: String(row.introtext || ''),
        ogTitle: String(row.ogtitle || ''),
        ogDescription: String(row.ogdescription || ''),
        ogImageUrl: String(row.ogimage || ''),
        canonicalUrl: String(row.canonicalurl || ''),
        seoStatus: 'red' as 'red' | 'yellow' | 'green',
        autoGenerated: false,
        lastAutoGenerate: undefined,
      },
    };
    
    // Final verification before passing to component
    const finalTimelineCount = Array.isArray(girl.timeline) ? girl.timeline.length : 0;
    console.log(`[Admin Edit Page] Final timeline count before passing to component: ${finalTimelineCount}`);
    console.log(`[Admin Edit Page] Final timeline data (first 5):`, JSON.stringify(girl.timeline.slice(0, 5), null, 2));
    
    if (finalTimelineCount === 0 && Array.isArray(timelineRows) && timelineRows.length > 0) {
      console.error(`[Admin Edit Page] CRITICAL: Timeline data lost! Had ${timelineRows.length} rows but girl.timeline has ${finalTimelineCount} items`);
    }
    if (finalTimelineCount > 0 && finalTimelineCount !== timelineRows.length) {
      console.warn(`[Admin Edit Page] WARNING: Timeline count mismatch! Raw rows: ${timelineRows.length}, Final: ${finalTimelineCount}`);
    }
    
    // Verify serialization - try to stringify the entire girl object
    try {
      const serialized = JSON.stringify(girl);
      console.log(`[Admin Edit Page] Successfully serialized girl object, size: ${serialized.length} bytes`);
      const parsed = JSON.parse(serialized);
      console.log(`[Admin Edit Page] After parse, timeline count: ${Array.isArray(parsed.timeline) ? parsed.timeline.length : 'NOT ARRAY'}`);
    } catch (serializeError: any) {
      console.error(`[Admin Edit Page] ERROR serializing girl object:`, serializeError.message);
    }

    return (
      <div className="space-y-6">
        <div>
          <Title level={2} style={{ margin: 0 }}>Edit Girl</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Update actress information</Text>
        </div>

        <GirlEditForm girl={girl} />
      </div>
    );
  } catch (error) {
    console.error('Error fetching girl:', error);
    notFound();
  }
}

