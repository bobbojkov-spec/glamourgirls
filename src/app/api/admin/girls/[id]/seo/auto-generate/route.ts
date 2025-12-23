import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateSEOEnhanced } from '@/lib/seo/generate-seo-enhanced';
import { requireAdminApi } from '@/app/api/admin/_auth';

// POST - Auto-generate SEO data
export async function POST(
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

    // Fetch actress data
    const [actressRows] = await pool.execute(
      `SELECT id, nm, firstname, familiq, middlenames, godini, theirman, slug
       FROM girls WHERE id = ?`,
      [actressId]
    ) as any[];

    if (!actressRows || actressRows.length === 0) {
      return NextResponse.json(
        { error: 'Actress not found' },
        { status: 404 }
      );
    }

    const row = actressRows[0];

    // Fetch timeline events
    const [timelineRows] = await pool.execute(
      `SELECT shrttext as date, lngtext as event 
       FROM girlinfos 
       WHERE girlid = ? 
       ORDER BY ord ASC`,
      [actressId]
    ) as any[];

    // Count gallery images
    const [galleryCountRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM images WHERE girlid = ? AND mytp = 4`,
      [actressId]
    ) as any[];
    const galleryCount = galleryCountRows[0]?.count || 0;

    // Get headshot URL
    const headshotUrl = `/api/actresses/${actressId}/headshot`;

    // Get first gallery image
    const [firstGalleryRows] = await pool.execute(
      `SELECT path FROM images WHERE girlid = ? AND mytp = 4 ORDER BY id ASC LIMIT 1`,
      [actressId]
    ) as any[];
    const firstGalleryImageUrl = firstGalleryRows[0]?.path || null;

    // Determine era
    const era = row.theirman === 1 ? '3' : (row.godini?.toString() || '3');

    // Generate slug if missing
    let slug = row.slug;
    if (!slug || slug.trim() === '') {
      slug = `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glamourgirlsofthesilverscreen.com';

    // Prepare data for SEO generation
    const actressDataForSEO = {
      id: actressId,
      name: row.nm || '',
      firstName: row.firstname || '',
      lastName: row.familiq || '',
      era,
      slug,
      galleryCount,
      timelineEvents: timelineRows.map((t: any) => ({
        date: t.date,
        event: t.event,
      })),
      headshotUrl,
      firstGalleryImageUrl,
    };

    // Generate SEO data
    const seoData = generateSEOEnhanced(actressDataForSEO, baseUrl);

    // Save to database (using camelCase column names)
    // Try to save introText if column exists, otherwise skip it
    try {
      await pool.execute(
        `UPDATE girls SET
          seotitle = ?,
          metadescription = ?,
          metakeywords = ?,
          h1title = ?,
          introtext = ?,
          ogtitle = ?,
          ogdescription = ?,
          ogimage = ?,
          canonicalurl = ?,
          slug = ?
         WHERE id = ?`,
        [
          seoData.seoTitle,
          seoData.seoDescription,
          seoData.seoKeywords,
          seoData.h1Title,
          seoData.introText || null,
          seoData.ogTitle,
          seoData.ogDescription,
          seoData.ogImageUrl,
          seoData.canonicalUrl,
          slug,
          actressId,
        ]
      );
    } catch (error: any) {
      // If introText column doesn't exist, save without it
      // PostgreSQL error: column "introtext" does not exist
      // MySQL error: ER_BAD_FIELD_ERROR
          if ((error.code === 'ER_BAD_FIELD_ERROR' || error.code === '42703' || error.message?.includes('introText') || error.message?.includes('introtext') || error.message?.includes('intro_text'))) {
            await pool.execute(
              `UPDATE girls SET
                seotitle = ?,
                metadescription = ?,
                metakeywords = ?,
                h1title = ?,
                ogtitle = ?,
                ogdescription = ?,
                ogimage = ?,
                canonicalurl = ?,
                slug = ?
               WHERE id = ?`,
          [
            seoData.seoTitle,
            seoData.seoDescription,
            seoData.seoKeywords,
            seoData.h1Title,
            seoData.ogTitle,
            seoData.ogDescription,
            seoData.ogImageUrl,
            seoData.canonicalUrl,
            slug,
            actressId,
          ]
        );
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      seoData,
      message: 'SEO data auto-generated successfully',
    });
  } catch (error) {
    console.error('Error auto-generating SEO data:', error);
    return NextResponse.json(
      { error: 'Failed to auto-generate SEO data' },
      { status: 500 }
    );
  }
}

