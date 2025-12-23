import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import GirlEditForm from '@/components/admin/girls/GirlEditForm';
import { access, stat } from 'fs/promises';
import path from 'path';
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
    const [photoCountRows] = await pool.execute(
      `SELECT 
        COUNT(*) FILTER (WHERE mytp = 4) as "photoCount",
        COUNT(*) FILTER (WHERE mytp = 5) as "hqPhotoCount"
       FROM images WHERE girlid = ?`,
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

    // Fetch timeline events
    const [timelineRows] = await pool.execute(
      `SELECT shrttext as date, lngtext as event, ord 
       FROM girlinfos 
       WHERE girlid = ? 
       ORDER BY ord ASC`,
      [girlId]
    ) as any[];

    // Fetch images - match frontend filtering exactly: mytp IN (3, 4, 5) with valid paths and dimensions
    const [imageRows] = await pool.execute(
      `SELECT id, path, width, height, mytp 
       FROM images 
       WHERE girlid = ? 
         AND mytp IN (3, 4, 5)
         AND path IS NOT NULL 
         AND path != ''
         AND width > 0 
         AND height > 0
       ORDER BY id ASC`,
      [girlId]
    ) as any[];

    // Separate gallery and HQ images
    const galleryImages = imageRows.filter((img: any) => img.mytp === 4);
    const hqImages = imageRows.filter((img: any) => img.mytp === 5);
    
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

    // Filter to only gallery images (mytp = 4) and check if files exist
    // Delete inactive images from database
    const validImages = [];
    for (const img of galleryImages) {
      if (!img.path) continue;
      
      const cleanPath = img.path.startsWith('/') ? img.path.slice(1) : img.path;
      const fullPath = path.join(process.cwd(), 'public', cleanPath);
      
      try {
        await access(fullPath);
        
        // Find associated HQ image
        const hqImage = hqMap.get(img.id);
        let hqInfo = null;
        
        if (hqImage && hqImage.path) {
          const hqCleanPath = hqImage.path.startsWith('/') ? hqImage.path.slice(1) : hqImage.path;
          const hqFullPath = path.join(process.cwd(), 'public', hqCleanPath);
          
          try {
            await access(hqFullPath);
            // Get file size - ensure it's a plain number, not a Stats object
            const stats = await stat(hqFullPath);
            const fileSizeMB = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
            
            hqInfo = {
              id: Number(hqImage.id) || 0, // Ensure it's a number, not BigInt
              width: Number(hqImage.width) || 0,
              height: Number(hqImage.height) || 0,
              sizeMB: Number(fileSizeMB) || 0, // Ensure it's a number
              url: String(hqImage.path || ''), // Ensure it's a string
            };
          } catch {
            // HQ file doesn't exist, skip it
          }
        }
        
        validImages.push({
          id: Number(img.id) || 0,
          path: String(img.path || ''),
          width: Number(img.width) || 0,
          height: Number(img.height) || 0,
          mytp: Number(img.mytp) || 0,
          hq: hqInfo ? {
            id: Number(hqInfo.id) || 0,
            width: Number(hqInfo.width) || 0,
            height: Number(hqInfo.height) || 0,
            sizeMB: Number(hqInfo.sizeMB) || 0,
            url: String(hqInfo.url || ''),
          } : null,
        });
      } catch {
        // File doesn't exist - delete from database
        console.log(`Image file not found, deleting from database: ${fullPath}`);
        try {
          await pool.execute(`DELETE FROM images WHERE id = ?`, [img.id]);
          // Also delete associated thumbnail if exists
          const [thumbRows] = await pool.execute(
            `SELECT id FROM images WHERE thumbid = ?`,
            [img.id]
          ) as any[];
          if (Array.isArray(thumbRows) && thumbRows.length > 0) {
            await pool.execute(`DELETE FROM images WHERE id = ?`, [thumbRows[0].id]);
          }
          // Delete associated HQ if exists
          if (hqMap.has(img.id)) {
            const hqImg = hqMap.get(img.id);
            await pool.execute(`DELETE FROM images WHERE id = ?`, [hqImg.id]);
          }
        } catch (deleteError) {
          console.error(`Error deleting image ${img.id} from database:`, deleteError);
        }
      }
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
    const headshotUrl = `/api/actresses/${girlId}/headshot`;

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
      timeline: Array.isArray(timelineRows) ? timelineRows.map((t: any) => ({
        date: String(t.date || ''),
        event: String(t.event || ''),
        ord: Number(t.ord) || 0,
      })) : [],
      images: validImages.map((img: any) => {
        const imgPath = String(img.path || '');
        return {
          id: Number(img.id) || 0, // Ensure it's a number, not BigInt
          path: imgPath,
          url: imgPath ? (imgPath.startsWith('/') ? imgPath : `/${imgPath}`) : '',
          width: Number(img.width) || 0,
          height: Number(img.height) || 0,
          type: Number(img.mytp) || 0,
          hq: img.hq && typeof img.hq === 'object' ? {
            id: Number(img.hq.id) || 0,
            width: Number(img.hq.width) || 0,
            height: Number(img.hq.height) || 0,
            sizeMB: Number(img.hq.sizeMB) || 0,
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
    
    // The girl object is already properly serialized above
    // No need for additional serialization

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

