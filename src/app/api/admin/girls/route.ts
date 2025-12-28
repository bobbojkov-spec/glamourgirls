import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { sanitizeLimitedHtml } from '@/lib/sanitizeLimitedHtml';
import { sanitizePlainText } from '@/lib/sanitizePlainText';

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const keyword = searchParams.get('keyword') || '';
    const published = searchParams.get('published') || 'all';
    const isNew = searchParams.get('isNew') || 'all';
    const hasNewPhotos = searchParams.get('hasNewPhotos') || 'all';
    const era = searchParams.get('era') || 'all';

    const requestedLimit = parseInt(searchParams.get('limit') || '100');
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 5000)
      : 100;
    const skip = (page - 1) * limit;

    let query = `
      SELECT g.id, g.nm, g.firstname, g.familiq, g.godini, g.isnew, g.isnewpix,
             g.published, g.theirman,
             COUNT(DISTINCT CASE WHEN i.mytp = 4 THEN i.id END)::int as "photoCount",
             COALESCE((
               SELECT COUNT(DISTINCT hq.id)
               FROM images hq
               WHERE hq.girlid = g.id
                 AND hq.mytp = 5
                 AND EXISTS (
                   SELECT 1 FROM images i2 
                   WHERE i2.girlid = hq.girlid 
                     AND i2.mytp = 4 
                     AND (i2.id = hq.id - 1 OR i2.id = hq.id + 1)
                 )
             ), 0)::int as "hqPhotoCount"
      FROM girls g
      LEFT JOIN images i ON g.id = i.girlid AND i.mytp IN (3, 4, 5)
      WHERE 1=1
    `;

    const params: any[] = [];

    // Published filter (admin)
    if (published && published !== 'all' && published !== '') {
      const pubValue = parseInt(published);
      if (!isNaN(pubValue)) {
        if (pubValue === 2) {
          query += ` AND g.published = ?`;
          params.push(2);
        } else if (pubValue === 1) {
          query += ` AND (g.published IS NULL OR g.published != ?)`;
          params.push(2);
        } else {
          query += ` AND g.published = ?`;
          params.push(pubValue);
        }
      }
    }

    // Is New filter
    if (isNew === 'yes') {
      query += ` AND g.isnew = 2`;
    } else if (isNew === 'no') {
      query += ` AND g.isnew = 1`;
    }

    // Has New Photos filter
    if (hasNewPhotos === 'yes') {
      query += ` AND g.isnewpix = 2`;
    } else if (hasNewPhotos === 'no') {
      query += ` AND g.isnewpix = 1`;
    }

    // Era filter (incl "men")
    if (era && era !== 'all') {
      if (era === 'men') {
        query += ` AND g.theirman = true`;
      } else {
        const eraMap: Record<string, number> = {
          '20-30s': 1,
          '40s': 2,
          '50s': 3,
          '60s': 4,
        };
        if (eraMap[era]) {
          query += ` AND g.godini = ?`;
          params.push(eraMap[era]);
        }
      }
    }

    // Keyword search (support both legacy `search` and `keyword`)
    const q = keyword || search;
    if (q) {
      query += ` AND (g.nm ILIKE ? OR g.firstname ILIKE ? OR g.familiq ILIKE ?)`;
      const searchParam = `%${q}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    // Use template literals for LIMIT/OFFSET since they're safe integers
    query += ` GROUP BY g.id ORDER BY g.nm ASC LIMIT ${limit} OFFSET ${skip}`;

    const [results] = await pool.execute(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT g.id) as total FROM girls g WHERE 1=1`;
    const countParams: any[] = [];

    if (published && published !== 'all' && published !== '') {
      const pubValue = parseInt(published);
      if (!isNaN(pubValue)) {
        if (pubValue === 2) {
          countQuery += ` AND g.published = ?`;
          countParams.push(2);
        } else if (pubValue === 1) {
          countQuery += ` AND (g.published IS NULL OR g.published != ?)`;
          countParams.push(2);
        } else {
          countQuery += ` AND g.published = ?`;
          countParams.push(pubValue);
        }
      }
    }
    if (isNew === 'yes') {
      countQuery += ` AND g.isnew = 2`;
    } else if (isNew === 'no') {
      countQuery += ` AND g.isnew = 1`;
    }
    if (hasNewPhotos === 'yes') {
      countQuery += ` AND g.isnewpix = 2`;
    } else if (hasNewPhotos === 'no') {
      countQuery += ` AND g.isnewpix = 1`;
    }
    if (era && era !== 'all') {
      if (era === 'men') {
        countQuery += ` AND g.theirman = true`;
      } else {
        const eraMap: Record<string, number> = {
          '20-30s': 1,
          '40s': 2,
          '50s': 3,
          '60s': 4,
        };
        if (eraMap[era]) {
          countQuery += ` AND g.godini = ?`;
          countParams.push(eraMap[era]);
        }
      }
    }
    if (q) {
      countQuery += ` AND (g.nm ILIKE ? OR g.firstname ILIKE ? OR g.familiq ILIKE ?)`;
      const searchParam = `%${q}%`;
      countParams.push(searchParam, searchParam, searchParam);
    }
    const [countResult] = await pool.execute(countQuery, countParams) as any[];
    const total = countResult[0]?.total || 0;

    const toNumOrNull = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toBool = (v: any): boolean => v === true || v === 1 || v === '1' || v === 't' || v === 'true' || v === 'yes';

    const girls = Array.isArray(results)
      ? results.map((row: any) => ({
          id: toNumOrNull(row.id) ?? row.id,
          name: String(row.nm || ''),
          firstName: String(row.firstname || ''),
          lastName: String(row.familiq || ''),
          slug: `${String(row.firstname || '')}-${String(row.familiq || '')}`.toLowerCase().replace(/\s+/g, '-'),
          published: toNumOrNull(row.published),
          isNew: toNumOrNull(row.isnew),
          hasNewPhotos: toNumOrNull(row.isnewpix),
          era: toNumOrNull(row.godini),
          theirMan: toBool(row.theirman),
          photoCount: Number(row.photoCount) || 0,
          hqPhotoCount: Number(row.hqPhotoCount) || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      : [];

    return NextResponse.json({ girls, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch girls' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const data = await request.json();

    // Validate and normalize links/books: no partially-filled rows.
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

    // Build full name
    // Prefer `name` if provided.
    const fullName =
      String(data?.name || '').trim() ||
      `${data.firstName || ''} ${data.middleNames || ''} ${data.lastName || ''}`.trim();

    // Insert new girl
    const [result] = await pool.execute(
      `INSERT INTO girls 
        (nm, firstname, middlenames, familiq, godini, membersonly, isnew, published, isnewpix, theirman, sources, fnu, fmu)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        data.firstName || '',
        data.middleNames || '',
        data.lastName || '',
        data.era || 3,
        data.isNew ? 2 : 1,
        data.published ? 2 : 1, // Default to unpublished (1) so admin can work on it
        data.hasNewPhotos ? 2 : 1,
        data.theirMan ? 1 : 0,
        sanitizeLimitedHtml(data.sources || ''),
        (data.firstName?.[0] || '').toUpperCase(),
        (data.middleNames?.[0] || data.firstName?.[0] || '').toUpperCase(),
      ]
    ) as any;

    const newId = result.insertId;

    // Insert timeline events
    if (data.timeline && Array.isArray(data.timeline)) {
      for (let i = 0; i < data.timeline.length; i++) {
        const event = data.timeline[i];
        if (event.date || event.event) {
          await pool.execute(
            `
            INSERT INTO girlinfos (girlid, shrttext, lngtext, ord)
            VALUES (?, ?, ?, ?)
            ON CONFLICT ON CONSTRAINT girlinfos_pkey
            DO UPDATE SET
              shrttext = EXCLUDED.shrttext,
              lngtext = EXCLUDED.lngtext,
              ord = EXCLUDED.ord
            `,
            [
              newId,
              sanitizeLimitedHtml(event.date || ''),
              sanitizeLimitedHtml(event.event || ''),
              Number(event.ord) > 0 ? Number(event.ord) : i + 1,
            ]
          );
        }
      }
    }

    // Insert links (tp = 0) - fail loudly if insert fails
    for (let i = 0; i < normLinks.length; i++) {
      const link = normLinks[i];
      if (!link.text || !link.url) continue;
      await pool.execute(
        `INSERT INTO girllinks (girlid, caption, lnk, ord, tp) VALUES (?, ?, ?, ?, 0)`,
        [newId, sanitizePlainText(link.text), trim(link.url), i + 1]
      );
    }

    // Insert books (tp = 1) - fail loudly if insert fails
    for (let i = 0; i < normBooks.length; i++) {
      const book = normBooks[i];
      if (!book.title || !book.url) continue;
      await pool.execute(
        `INSERT INTO girllinks (girlid, caption, lnk, ord, tp) VALUES (?, ?, ?, ?, 1)`,
        [newId, sanitizePlainText(book.title), trim(book.url), i + 1]
      );
    }

    return NextResponse.json({ id: newId, success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to create girl' },
      { status: 500 }
    );
  }
}
