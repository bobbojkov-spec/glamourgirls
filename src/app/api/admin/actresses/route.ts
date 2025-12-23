import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { searchParams } = new URL(request.url);
    
    // Build query with image counts
    let query = `
      SELECT g.id, g.nm, g.firstname, g.familiq, g.godini, g.isnew, g.isnewpix, 
             g.published, g.theirman,
             COUNT(DISTINCT CASE WHEN i.mytp = 4 THEN i.id END)::int as "photoCount",
             COUNT(DISTINCT CASE WHEN i.mytp = 5 THEN i.id END)::int as "hqPhotoCount"
      FROM girls g
      LEFT JOIN images i ON g.id = i.girlid
      WHERE 1=1
    `;

    const params: any[] = [];

    const isNew = searchParams.get('isNew');
    if (isNew === 'yes') {
      query += ` AND g.isnew = 2`;
    } else if (isNew === 'no') {
      query += ` AND g.isnew = 1`;
    }

    const published = searchParams.get('published');
    if (published && published !== 'all') {
      query += ` AND g.published = ?`;
      params.push(published);
    }

    const isNewPix = searchParams.get('isNewPix');
    if (isNewPix === 'yes') {
      query += ` AND g.isnewpix = 2`;
    } else if (isNewPix === 'no') {
      query += ` AND g.isnewpix = 1`;
    }

    const years = searchParams.get('years');
    if (years && years !== 'all') {
      query += ` AND g.godini = ?`;
      params.push(years);
    }

    const nameStartsWith = searchParams.get('nameStartsWith');
    if (nameStartsWith && nameStartsWith !== 'all') {
      query += ` AND g.firstname ILIKE ?`;
      params.push(`${nameStartsWith}%`);
    }

    const surnameStartsWith = searchParams.get('surnameStartsWith');
    if (surnameStartsWith && surnameStartsWith !== 'all') {
      query += ` AND g.familiq ILIKE ?`;
      params.push(`${surnameStartsWith}%`);
    }

    const keyword = searchParams.get('keyword');
    if (keyword) {
      query += ` AND (g.nm ILIKE ? OR g.firstname ILIKE ? OR g.familiq ILIKE ?)`;
      const keywordParam = `%${keyword}%`;
      params.push(keywordParam, keywordParam, keywordParam);
    }

    query += ` GROUP BY g.id ORDER BY g.familiq, g.firstname`;

    const [results] = await pool.execute(query, params);

    const actresses = Array.isArray(results) ? results.map((row: any) => ({
      id: row.id,
      name: row.nm,
      firstName: row.firstname,
      lastName: row.familiq,
      published: row.published,
      photoCount: row.photoCount || 0,
      hqPhotoCount: row.hqPhotoCount || 0,
    })) : [];

    return NextResponse.json(actresses);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actresses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Insert new actress
    const [result] = await pool.execute(
      `INSERT INTO girls 
        (nm, firstname, middlenames, familiq, godini, membersonly, isnew, published, isnewpix, theirman, sources, fnu, fmu)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `${data.firstname} ${data.middlenames ? data.middlenames + ' ' : ''}${data.familiq}`.trim(),
        data.firstname,
        data.middlenames || '',
        data.familiq,
        data.godini || 3,
        data.isnew || 1,
        data.published || 1, // Default to unpublished (1) so admin can work on it
        data.isnewpix || 1,
        data.theirman || 0,
        data.sources || '',
        data.firstname?.[0]?.toUpperCase() || '',
        data.middlenames?.[0]?.toUpperCase() || data.firstname?.[0]?.toUpperCase() || '',
      ]
    ) as any;

    const newId = result.insertId;

    // Insert timeline events
    if (data.timeline && Array.isArray(data.timeline)) {
      for (const event of data.timeline) {
        if (event.date || event.event) {
          await pool.execute(
            `INSERT INTO girlinfos (girlid, shrttext, lngtext, ord) VALUES (?, ?, ?, ?)`,
            [newId, event.date || '', event.event || '', event.ord || 0]
          );
        }
      }
    }

    return NextResponse.json({ id: newId, success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to create actress' },
      { status: 500 }
    );
  }
}
