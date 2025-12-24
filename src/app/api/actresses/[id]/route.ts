import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { Actress } from '@/types/actress';

function extractYearFromText(value?: string | null) {
  if (!value) return null;
  const match = value.match(/(18|19|20)\d{2}/);
  return match ? parseInt(match[0], 10) : null;
}

function detectBirthYear(timeline: any[]) {
  if (!Array.isArray(timeline) || timeline.length === 0) return null;
  const birthEvent = timeline.find((item: any) => {
    const text = item.lngtext?.toLowerCase() || '';
    return text.includes('born') || text.includes('birth');
  });

  return (
    extractYearFromText(birthEvent?.shrttext) ||
    extractYearFromText(birthEvent?.lngtext) ||
    extractYearFromText(timeline[0]?.shrttext) ||
    null
  );
}

function detectDeathYear(timeline: any[]) {
  if (!Array.isArray(timeline) || timeline.length === 0) return null;
  const deathEvent = [...timeline].reverse().find((item: any) => {
    const text = item.lngtext?.toLowerCase() || '';
    return (
      text.includes('dies') ||
      text.includes('died') ||
      text.includes('dead') ||
      text.includes('passed') ||
      text.includes('passes')
    );
  });

  return (
    extractYearFromText(deathEvent?.shrttext) ||
    extractYearFromText(deathEvent?.lngtext) ||
    null
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actressId = parseInt(id);

    if (isNaN(actressId)) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    // Test database connection first
    try {
      const [testResult] = await pool.execute(`SELECT COUNT(*) as total FROM girls WHERE published = 2`) as any[];
      const totalCount = testResult?.[0]?.total || 0;
      console.log(`📊 Total published actresses in database: ${totalCount}`);
    } catch (testError: any) {
      console.error('❌ Database connection test failed:', testError.message);
    }

    // Fetch actress data including SEO h1Title
    let actresses: any[];
    try {
      console.log(`🔍 Fetching actress ID: ${actressId}`);
      [actresses] = await pool.execute(
             `SELECT id, nm, firstname, middlenames, familiq, godini, isnew, isnewpix, theirman, sources, slug, h1Title
         FROM girls 
         WHERE id = ? AND published = 2`,
        [actressId]
      ) as any[];
      console.log(`✅ Found ${Array.isArray(actresses) ? actresses.length : 0} actress(es) with ID ${actressId}`);
    } catch (error: any) {
      console.error('❌ Error fetching actress from girls table:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      throw new Error(`Failed to fetch actress: ${error.message}`);
    }

    if (!Array.isArray(actresses) || actresses.length === 0) {
      // Check if actress exists but is not published
      try {
        const [unpublished] = await pool.execute(
          `SELECT id, published FROM girls WHERE id = ?`,
          [actressId]
        ) as any[];
        if (Array.isArray(unpublished) && unpublished.length > 0) {
          console.log(`⚠️ Actress ${actressId} exists but published = ${unpublished[0].published} (expected 2)`);
        } else {
          console.log(`⚠️ Actress ${actressId} does not exist in database`);
        }
      } catch (checkError) {
        // Ignore check errors
      }
      return NextResponse.json({ error: 'Actress not found' }, { status: 404 });
    }

    const actress = actresses[0] as any;

    // Fetch biography/timeline
    let timeline: any[];
    try {
      [timeline] = await pool.execute(
        `SELECT shrttext, lngtext, ord
         FROM girlinfos 
         WHERE girlid = ? 
         ORDER BY ord ASC`,
        [actressId]
      ) as any[];
    } catch (error: any) {
      console.error('Error fetching timeline from girlinfos table:', error.message);
      timeline = []; // Continue with empty timeline
    }

    // Fetch images - only get valid gallery/HQ/thumb images (mytp 3,4,5) with valid paths
    let images: any[];
    try {
      [images] = await pool.execute(
        `SELECT id, path, width, height, mytp, thumbid, sz, imgtype
         FROM images 
         WHERE girlid = ? 
           AND mytp IN (3, 4, 5)
           AND path IS NOT NULL 
           AND path != ''
           AND width > 0 
           AND height > 0
         ORDER BY id ASC`,
        [actressId]
      ) as any[];
    } catch (error: any) {
      console.error('Error fetching images from images table:', error.message);
      images = []; // Continue with empty images
    }

    // Map era number to string
    const eraMap: Record<number, string> = {
      1: '20-30s',
      2: '40s',
      3: '50s',
      4: '60s',
    };

    // Process images to separate gallery, HQ, and thumbnails
    const imageList = Array.isArray(images) ? images : [];
    
    // Filter gallery images (mytp=4) - these are the display images
    const galleryImages = imageList.filter((img: any) => img.mytp === 4 && img.path);
    
    // Filter HQ images (mytp=5)
    const hqImages = imageList.filter((img: any) => img.mytp === 5 && img.path);
    
    // Filter thumbnails (mytp=3)
    const thumbnails = imageList.filter((img: any) => img.mytp === 3 && img.path);

    // Build image map
    const imageMap = new Map();
    imageList.forEach((img: any) => {
      imageMap.set(img.id, img);
    });

    // Count photos
    const photoCount = galleryImages.length;
    const hqPhotoCount = hqImages.length;

    // Extract birth name from first timeline event if it has no date
    const timelineArray = Array.isArray(timeline) ? timeline : [];
    const firstEvent = timelineArray.length > 0 ? timelineArray[0] : null;
    const hasNoDate = firstEvent && (!firstEvent.shrttext || firstEvent.shrttext.trim() === '');
    
    const birthName = hasNoDate && firstEvent.lngtext
      ? firstEvent.lngtext.replace(/[()]/g, '').trim()
      : undefined;
    
    // Filter out the first timeline event if it was used as birth name
    const filteredTimeline = timelineArray
      .filter((item: any, index: number) => {
        // Skip first event if it's being used as birth name (no date)
        if (index === 0 && hasNoDate) {
          return false;
        }
        return true;
      })
      .map((item: any) => ({
        date: item.shrttext || '',
        event: item.lngtext,
      }));

    // Fetch links and books from girllinks table
    // tp = 0 means regular link, tp = 1 means recommended book
    let allLinks: any[] = [];
    try {
      const [linkResults] = await pool.execute(
        `SELECT id, girlid, caption, lnk, ord, tp FROM girllinks WHERE girlid = ? ORDER BY ord ASC`,
        [actressId]
      );
      allLinks = Array.isArray(linkResults) ? linkResults : [];
    } catch {
      // Table might not exist
    }

    // Separate links (tp = 0) from books (tp = 1)
    const links = allLinks
      .filter((item: any) => item.tp === 0 || item.tp === null || item.tp === undefined)
      .map((item: any) => ({
        id: item.id,
        text: item.caption || '',
        url: item.lnk || '',
        ord: item.ord || 0,
      }));

    const books = allLinks
      .filter((item: any) => item.tp === 1)
      .map((item: any) => ({
        id: item.id,
        title: item.caption || '',
        url: item.lnk || '',
        ord: item.ord || 0,
      }));

    // Generate slug if not present
    let slug = actress.slug;
    if (!slug) {
      slug = `${actress.firstname || ''}-${actress.familiq || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    const birthYear = detectBirthYear(timelineArray);
    const deathYear = detectDeathYear(timelineArray);

    const biographyParagraphs = filteredTimeline
      .map((item: any) => item.event)
      .filter((text: string) => !!text && text.trim().length > 0);

    const introText = biographyParagraphs[0] || '';

    let relatedActresses: any[] = [];
    try {
      // First, try to get from related_actresses table (if script has been run)
      try {
        const [relatedRows] = await pool.execute(
          `SELECT g.id, g.nm, g.slug, g.godini, ra.reason, ra.score
           FROM related_actresses ra
           INNER JOIN girls g ON ra.related_id = g.id
           WHERE ra.actress_id = ? 
             AND g.published = 2
           ORDER BY ra.score DESC, RAND()
           LIMIT 8`,
          [actressId]
        ) as any[];

        if (Array.isArray(relatedRows) && relatedRows.length > 0) {
          relatedActresses = relatedRows.map((row: any) => ({
            id: row.id,
            name: row.nm,
            slug: row.slug || `${row.id}`,
            era: eraMap[row.godini] || '50s',
            reason: row.reason,
            score: row.score,
          }));
        }
      } catch (tableError: any) {
        // Table might not exist yet, fall through to fallback
        if (!tableError.message?.includes("doesn't exist")) {
          console.error('Error fetching from related_actresses table:', tableError);
        }
      }

      // Fallback: If no relations found, use same era (old method)
      if (relatedActresses.length === 0) {
        const [fallbackRows] = await pool.execute(
          `SELECT id, nm, slug, godini 
           FROM girls 
           WHERE published = 2 
             AND godini = ? 
             AND id != ? 
           ORDER BY RAND()
           LIMIT 5`,
          [actress.godini, actressId]
        ) as any[];
        relatedActresses = Array.isArray(fallbackRows)
          ? fallbackRows.map((row: any) => ({
              id: row.id,
              name: row.nm,
              slug: row.slug || `${row.id}`,
              era: eraMap[row.godini] || '50s',
            }))
          : [];
      }
    } catch (relatedError) {
      console.error('Error fetching related actresses:', relatedError);
      relatedActresses = [];
    }

    // Map database response to typed Actress interface
    const actressResponse: Actress = {
      id: actress.id,
      name: actress.nm,
      firstName: actress.firstname,
      middleNames: actress.middlenames,
      lastName: actress.familiq,
      slug: slug,
      era: eraMap[actress.godini] || '50s',
      isNew: actress.isnew === 2,
      hasNewPhotos: actress.isnewpix === 2,
      theirMan: Boolean(actress.theirman) === true,
      sources: actress.sources,
      birthName: birthName,
      birthYear,
      deathYear,
      introText,
      biographyParagraphs,
      timeline: filteredTimeline,
      links: links,
      books: books,
      photoCount,
      hqPhotoCount,
      h1Title: actress.h1Title || null,
      relatedActresses,
      images: {
        gallery: galleryImages
          .filter((img: any) => {
            // Only include images with valid paths (securepic or newpic)
            const path = img.path || '';
            return path.includes('/securepic/') || path.includes('/newpic/');
          })
          .map((img: any) => {
            // Find thumbnail for this gallery image
            const thumbnail = thumbnails.find((thumb: any) => {
              // Check if thumbid matches or path contains gallery image ID
              return thumb.id === img.thumbid || 
                     thumb.path?.includes(`thumb${img.id}`) ||
                     thumb.path?.includes(`thumb${img.id}`);
            });
            
            // Convert database paths to Supabase Storage URLs
            const getStorageUrl = (path: string | null | undefined): string => {
              if (!path) return '';
              if (path.startsWith('http')) return path; // Already a URL
              
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              if (!supabaseUrl) return path; // Fallback to original path if Supabase URL not set
              
              const cleanPath = path.startsWith('/') ? path.slice(1) : path;
              return `${supabaseUrl}/storage/v1/object/public/glamourgirls_images/${cleanPath}`;
            };
            
            return {
              id: img.id,
              url: getStorageUrl(img.path),
              width: img.width,
              height: img.height,
              size: img.sz,
              thumbnailId: img.thumbid,
              thumbnailUrl: getStorageUrl(thumbnail?.path || ''),
            };
          }),
        hq: hqImages.map((img: any) => {
          // HQ images are in images_raw bucket (private) - these should not be directly accessible via public URL
          // For now, return the path - the download API will handle fetching from the correct bucket
          const getHqStorageUrl = (path: string | null | undefined): string => {
            if (!path) return '';
            if (path.startsWith('http')) return path; // Already a URL
            
            // HQ images are in private bucket, so we return the path for the download API to handle
            // The frontend should use the download API with a code for HQ images
            return path;
          };
          
          return {
            id: img.id,
            url: getHqStorageUrl(img.path),
            width: img.width,
            height: img.height,
            size: img.sz,
          };
        }),
        thumbnails: thumbnails.map((thumb: any) => {
          const getStorageUrl = (path: string | null | undefined): string => {
            if (!path) return '';
            if (path.startsWith('http')) return path; // Already a URL
            
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) return path; // Fallback to original path if Supabase URL not set
            
            const cleanPath = path.startsWith('/') ? path.slice(1) : path;
            return `${supabaseUrl}/storage/v1/object/public/glamourgirls_images/${cleanPath}`;
          };
          
          return {
            id: thumb.id,
            url: getStorageUrl(thumb.path),
            width: thumb.width,
            height: thumb.height,
          };
        }),
      },
    };

    return NextResponse.json(actressResponse);
  } catch (error: any) {
    console.error('Database error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch actress data',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
