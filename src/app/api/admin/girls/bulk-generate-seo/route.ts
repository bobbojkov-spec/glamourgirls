import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateSEOEnhanced } from '@/lib/seo/generate-seo-enhanced';
import { requireAdminApi } from '@/app/api/admin/_auth';

// POST - Bulk generate SEO for all entries
export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const body = await request.json().catch(() => ({}));
    const { limit, offset, onlyMissing } = body;

    // Fetch all girls (or a batch if limit/offset provided)
    let query = `SELECT id, nm, firstname, familiq, middlenames, godini, theirman, slug FROM girls`;
    const params: any[] = [];

    // If onlyMissing is true, only process entries without SEO data
    if (onlyMissing) {
      query += ` WHERE (seotitle IS NULL OR seotitle = '' OR metadescription IS NULL OR metadescription = '')`;
    }

    query += ` ORDER BY id ASC`;

    // Add pagination if provided
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
      if (offset) {
        query += ` OFFSET ${parseInt(offset)}`;
      }
    }

    const [girlRows] = await pool.execute(query, params) as any[];

    if (!girlRows || girlRows.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        total: 0,
        message: 'No entries found to process',
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glamourgirlsofthesilverscreen.com';
    const results = {
      processed: 0,
      errors: [] as Array<{ id: number; name: string; error: string }>,
      success: [] as Array<{ id: number; name: string }>,
    };

    // Process each girl
    for (const row of girlRows) {
      try {
        const actressId = row.id;

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
          `SELECT COUNT(*)::int as count FROM images WHERE girlid = ? AND mytp = 4`,
          [actressId]
        ) as any[];
        const galleryCount = galleryCountRows[0]?.count || 0;

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
          headshotUrl: `/api/actresses/${actressId}/headshot`,
          firstGalleryImageUrl,
        };

        // Generate SEO data
        const seoData = generateSEOEnhanced(actressDataForSEO, baseUrl);

        // Save to database
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

        results.processed++;
        results.success.push({ id: actressId, name: row.nm || 'Unknown' });
      } catch (error: any) {
        console.error(`Error processing girl ${row.id}:`, error);
        results.errors.push({
          id: row.id,
          name: row.nm || 'Unknown',
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.processed,
      total: girlRows.length,
      successful: results.success.length,
      failed: results.errors.length,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Processed ${results.processed} of ${girlRows.length} entries`,
    });
  } catch (error) {
    console.error('Error bulk generating SEO:', error);
    return NextResponse.json(
      { error: 'Failed to bulk generate SEO', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Get statistics about SEO generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyMissing = searchParams.get('onlyMissing') === 'true';

    // Count total entries
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*)::int as total FROM girls`
    ) as any[];
    const total = totalRows[0]?.total || 0;

    // Count entries with SEO data
    const [withSEORows] = await pool.execute(
      `SELECT COUNT(*)::int as count FROM girls 
       WHERE seoTitle IS NOT NULL AND seoTitle != '' 
       AND metaDescription IS NOT NULL AND metaDescription != ''`
    ) as any[];
    const withSEO = withSEORows[0]?.count || 0;

    // Count entries without SEO data
    const withoutSEO = total - withSEO;

    return NextResponse.json({
      success: true,
      total,
      withSEO,
      withoutSEO,
      percentage: total > 0 ? Math.round((withSEO / total) * 100) : 0,
    });
  } catch (error) {
    console.error('Error getting SEO statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get SEO statistics' },
      { status: 500 }
    );
  }
}

