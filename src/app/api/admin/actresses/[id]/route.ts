import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { id } = await params;
    const actressId = parseInt(id);

    if (isNaN(actressId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Fetch actress
    const [actresses] = await pool.execute(
      `SELECT * FROM girls WHERE id = ?`,
      [actressId]
    );

    if (!Array.isArray(actresses) || actresses.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const actress = actresses[0] as any;

    // Fetch timeline - CRITICAL: Use COALESCE to never drop rows with NULL ord
    const [timelineRows] = await pool.execute(
      `SELECT id, shrttext, lngtext, ord FROM girlinfos WHERE girlid = ? ORDER BY COALESCE(ord, 999999) ASC, id ASC`,
      [actressId]
    );
    const timeline = Array.isArray(timelineRows) ? timelineRows : [];

    // Fetch images - separate by type
    const [allImages] = await pool.execute(
      `SELECT id, path, width, height, mytp, thumbid, sz FROM images 
       WHERE girlid = ? AND mytp IN (3, 4, 5) ORDER BY id ASC`,
      [actressId]
    );

    const imageList = Array.isArray(allImages) ? allImages : [];
    const galleryImages = imageList.filter((img: any) => img.mytp === 4);
    const hqImages = imageList.filter((img: any) => img.mytp === 5);
    const thumbnails = imageList.filter((img: any) => img.mytp === 3);

    // Format images for display
    const formattedImages = galleryImages.map((galleryImg: any) => {
      const thumbnail = thumbnails.find((thumb: any) => 
        thumb.id === galleryImg.thumbid || 
        thumb.path?.includes(`thumb${galleryImg.id}`)
      );
      const hq = hqImages.find((hqImg: any) => hqImg.id === galleryImg.id - 1);
      
      // Ensure paths start with /
      const galleryPath = galleryImg.path?.startsWith('/') ? galleryImg.path : `/${galleryImg.path}`;
      const thumbPath = thumbnail?.path?.startsWith('/') ? thumbnail.path : thumbnail?.path ? `/${thumbnail.path}` : '';
      const hqPath = hq?.path?.startsWith('/') ? hq.path : hq?.path ? `/${hq.path}` : '';
      
      return {
        id: galleryImg.id,
        url: galleryPath,
        thumbnailUrl: thumbPath,
        hqUrl: hqPath,
        width: galleryImg.width,
        height: galleryImg.height,
      };
    });

    // Fetch links (if girllinks table exists)
    let links: any[] = [];
    try {
      const [linkResults] = await pool.execute(
        `SELECT * FROM girllinks WHERE girlid = ? ORDER BY ord ASC`,
        [actressId]
      );
      links = Array.isArray(linkResults) ? linkResults : [];
    } catch {
      // Table might not exist
    }

    // Format timeline data
    const formattedTimeline = timeline.map((item: any) => ({
      id: item.id,
      date: item.shrttext || '',
      event: item.lngtext || '',
      ord: item.ord || 0,
    }));

    return NextResponse.json({
      ...actress,
      timeline: formattedTimeline,
      images: formattedImages,
      links: links,
      books: [], // TODO: Add books table if it exists
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actress' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { id } = await params;
    const actressId = parseInt(id);
    const data = await request.json();

    // Update main actress record
    await pool.execute(
      `UPDATE girls SET 
        firstname = ?, middlenames = ?, familiq = ?, 
        godini = ?, isnew = ?, 
        published = ?, isnewpix = ?, theirman = ?, sources = ?
       WHERE id = ?`,
      [
        data.firstname,
        data.middlenames,
        data.familiq,
        data.godini,
        data.isnew,
        data.published,
        data.isnewpix,
        data.theirman,
        data.sources,
        actressId,
      ]
    );

    // Update timeline
    // Delete existing
    await pool.execute(`DELETE FROM girlinfos WHERE girlid = ?`, [actressId]);
    
    // Insert new/updated timeline events
    if (data.timeline && Array.isArray(data.timeline)) {
      let order = 1;
      for (const event of data.timeline) {
        if (event.date || event.event) {
          await pool.execute(
            `INSERT INTO girlinfos (girlid, shrttext, lngtext, ord) VALUES (?, ?, ?, ?)`,
            [actressId, event.date || '', event.event || '', event.ord || order]
          );
          order++;
        }
      }
    }

    // Update full name (nm) based on first/middle/family names
    const fullName = `${data.firstname} ${data.middlenames ? data.middlenames + ' ' : ''}${data.familiq}`.trim();
    await pool.execute(
      `UPDATE girls SET nm = ?, fnu = ?, fmu = ? WHERE id = ?`,
      [
        fullName,
        data.firstname?.[0]?.toUpperCase() || '',
        data.middlenames?.[0]?.toUpperCase() || data.firstname?.[0]?.toUpperCase() || '',
        actressId,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to update actress' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actressId = parseInt(id);
    const data = await request.json();

    // Update only published status
    if (data.published !== undefined) {
      await pool.execute(
        `UPDATE girls SET published = ? WHERE id = ?`,
        [data.published, actressId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { id } = await params;
    const actressId = parseInt(id);

    // Delete in order: timeline, images, then actress
    await pool.execute(`DELETE FROM girlinfos WHERE girlid = ?`, [actressId]);
    await pool.execute(`DELETE FROM images WHERE girlid = ?`, [actressId]);
    
    // Delete links if table exists
    try {
      await pool.execute(`DELETE FROM girllinks WHERE girlid = ?`, [actressId]);
    } catch {
      // Table might not exist
    }

    // Finally delete the actress
    await pool.execute(`DELETE FROM girls WHERE id = ?`, [actressId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to delete actress' },
      { status: 500 }
    );
  }
}
