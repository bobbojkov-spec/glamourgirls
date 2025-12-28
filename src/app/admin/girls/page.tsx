import pool from '@/lib/db';
import GirlsTable from '@/components/admin/girls/GirlsTable';

interface PageProps {
  searchParams: Promise<{ 
    page?: string; 
    search?: string;
    published?: string;
    isNew?: string;
    hasNewPhotos?: string;
    era?: string;
    theirMan?: string;
    nameStartsWith?: string;
    surnameStartsWith?: string;
    keyword?: string;
  }>;
}

export default async function GirlsListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const search = params.keyword || params.search || '';
  const nameStartsWith = params.nameStartsWith || '';
  const surnameStartsWith = params.surnameStartsWith || '';
  const isNew = params.isNew || 'all';
  const hasNewPhotos = params.hasNewPhotos || 'all';
  const era = params.era || 'all';
  const theirMan = params.theirMan;
  // Default to 'all' if not specified, so we show all entries by default
  const published = params.published !== undefined ? String(params.published) : 'all';
  const limit = 100;
  const skip = (page - 1) * limit;

  let girls: any[] = [];
  let total = 0;

  try {
    // Canonical counting: photoCount = gallery images (mytp=4), hqPhotoCount = HQ images with matching gallery
    // Use subquery for HQ count to avoid cartesian product and ensure HQ <= gallery count
    let query = `
      SELECT g.id, g.nm, g.firstname, g.familiq, g.godini, g.isnew, g.isnewpix, 
             g.published, g.theirman,
             COALESCE(COUNT(DISTINCT CASE WHEN i.mytp = 4 THEN i.id END), 0)::int as "photoCount",
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

    const queryParams: any[] = [];

    // Published filter (admin only - frontend always uses published = 2)
    // Only filter if published is explicitly set and not 'all'
    if (published && published !== 'all' && published !== '') {
      const pubValue = parseInt(published);
      if (!isNaN(pubValue)) {
        if (pubValue === 2) {
          // Published
          query += ` AND g.published = ?`;
          queryParams.push(2);
        } else if (pubValue === 1) {
          // Unpublished = anything not published (historically can be 0/1/NULL)
          query += ` AND (g.published IS NULL OR g.published != ?)`;
          queryParams.push(2);
        } else {
          // Fallback to exact match for any other value
          query += ` AND g.published = ?`;
          queryParams.push(pubValue);
        }
      }
    }
    // If 'all' or empty, no published filter is added (shows all entries)

    // Name starts with (same as frontend) - use LOWER() for case-insensitive search in PostgreSQL
    if (nameStartsWith) {
      query += ` AND LOWER(g.firstname) LIKE LOWER(?)`;
      queryParams.push(`${nameStartsWith}%`);
    }

    // Surname starts with (same as frontend) - use LOWER() for case-insensitive search in PostgreSQL
    if (surnameStartsWith) {
      query += ` AND LOWER(g.familiq) LIKE LOWER(?)`;
      queryParams.push(`${surnameStartsWith}%`);
    }

    // Keyword search (same as frontend) - use ILIKE for case-insensitive search in PostgreSQL
    // Also use LOWER() to ensure case-insensitivity regardless of database collation
    if (search) {
      query += ` AND (LOWER(g.nm) LIKE LOWER(?) OR LOWER(g.firstname) LIKE LOWER(?) OR LOWER(g.familiq) LIKE LOWER(?))`;
      const keywordParam = `%${search}%`;
      queryParams.push(keywordParam, keywordParam, keywordParam);
    }

    // Era filter - handle "men" as Their Men
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
          queryParams.push(eraMap[era]);
        }
      }
    }

    // Is New filter (EXACT same as frontend)
    if (isNew === 'yes') {
      query += ` AND g.isnew = 2`;
    } else if (isNew === 'no') {
      query += ` AND g.isnew = 1`;
    }

    // Has New Photos filter (EXACT same as frontend)
    if (hasNewPhotos === 'yes') {
      query += ` AND g.isnewpix = 2`;
    } else if (hasNewPhotos === 'no') {
      query += ` AND g.isnewpix = 1`;
    }

    query += ` GROUP BY g.id, g.nm, g.firstname, g.familiq, g.godini, g.isnew, g.isnewpix, g.published, g.theirman ORDER BY g.nm ASC LIMIT ${limit} OFFSET ${skip}`;

    const [results] = await pool.execute(query, queryParams) as any[];
    
    // Debug: Log query results for troubleshooting
    if (results && results.length > 0) {
      console.log('[GirlsList] Sample result:', {
        id: results[0]?.id,
        name: results[0]?.nm,
        photoCount: results[0]?.photoCount,
        photoCountType: typeof results[0]?.photoCount,
      });
    }

    // Get total count (same filters)
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
    if (nameStartsWith) {
      countQuery += ` AND LOWER(g.firstname) LIKE LOWER(?)`;
      countParams.push(`${nameStartsWith}%`);
    }
    if (surnameStartsWith) {
      countQuery += ` AND LOWER(g.familiq) LIKE LOWER(?)`;
      countParams.push(`${surnameStartsWith}%`);
    }
    if (search) {
      countQuery += ` AND (LOWER(g.nm) LIKE LOWER(?) OR LOWER(g.firstname) LIKE LOWER(?) OR LOWER(g.familiq) LIKE LOWER(?))`;
      const keywordParam = `%${search}%`;
      countParams.push(keywordParam, keywordParam, keywordParam);
    }
    if (era && era !== 'all' && era !== 'men') {
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
    
    // Handle "men" as era value (Their Men)
    if (era === 'men') {
      countQuery += ` AND g.theirman = true`;
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
    if (theirMan === 'true' && era !== 'men') {
      countQuery += ` AND g.theirman = true`;
    }
    
    const [countResult] = await pool.execute(countQuery, countParams) as any[];
    total = countResult[0]?.total || 0;

    girls = Array.isArray(results) ? results.map((row: any) => {
      // Ensure photoCount is a number (handle string conversion from PostgreSQL)
      const photoCount = typeof row.photoCount === 'string' 
        ? parseInt(row.photoCount, 10) || 0 
        : Number(row.photoCount) || 0;
      const hqPhotoCount = typeof row.hqPhotoCount === 'string'
        ? parseInt(row.hqPhotoCount, 10) || 0
        : Number(row.hqPhotoCount) || 0;
      
      return {
        id: row.id,
        name: row.nm,
        firstName: row.firstname,
        lastName: row.familiq,
        slug: `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        photoCount: photoCount,
        hqPhotoCount: hqPhotoCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }) : [];
  } catch (error) {
    console.error('Error fetching girls:', error);
    girls = [];
    total = 0;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <GirlsTable
      girls={girls}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      searchParams={{
        published,
        isNew,
        hasNewPhotos,
        era,
        keyword: search,
      }}
    />
  );
}
