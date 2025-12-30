import dotenv from 'dotenv';
import path from 'path';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

/**
 * Find all actresses that are using the first gallery image as their headshot
 * (i.e., actresses that don't have a headshot.jpg in the database)
 */

interface ActressInfo {
  id: number;
  name: string;
  slug: string;
  firstGalleryImageId: number | null;
  firstGalleryImagePath: string | null;
  hasHeadshot: boolean;
  headshotPath: string | null;
}

async function findActressesUsingFirstGalleryAsHeadshot() {
  try {
    console.log('🔍 Finding actresses using first gallery image as headshot...\n');
    
    // Fetch all published actresses
    const [actresses] = await pool.execute(
      `SELECT id, nm as name, slug 
       FROM girls 
       WHERE published = 2
       ORDER BY id ASC`
    ) as any[];
    
    console.log(`Found ${actresses.length} published actresses to check\n`);
    
    const actressesUsingFirstGallery: ActressInfo[] = [];
    
    for (const actress of actresses) {
      const actressId = actress.id;
      
      // Check if headshot.jpg exists in database
      const [headshotResults] = await pool.execute(
        `SELECT id, path 
         FROM images 
         WHERE girlid = ? 
           AND path IS NOT NULL 
           AND path != ''
           AND (
             path ILIKE '%headshot.jpg' 
             OR path ILIKE '%headshot.jpeg'
             OR path ILIKE '%headshot.png'
           )
         LIMIT 1`,
        [actressId]
      ) as any[];
      
      const hasHeadshot = Array.isArray(headshotResults) && headshotResults.length > 0;
      const headshotPath = hasHeadshot ? headshotResults[0].path : null;
      
      // If no headshot, get first portrait-oriented gallery image (mytp = 4)
      if (!hasHeadshot) {
        const [firstGalleryResults] = await pool.execute(
          `SELECT id, path 
           FROM images 
           WHERE girlid = ? 
             AND mytp = 4
             AND path IS NOT NULL 
             AND path != ''
             AND width > 0 
             AND height > 0
             AND height > width
           ORDER BY id ASC
           LIMIT 1`,
          [actressId]
        ) as any[];
        
        if (Array.isArray(firstGalleryResults) && firstGalleryResults.length > 0) {
          actressesUsingFirstGallery.push({
            id: actressId,
            name: actress.name,
            slug: actress.slug || '',
            firstGalleryImageId: firstGalleryResults[0].id,
            firstGalleryImagePath: firstGalleryResults[0].path,
            hasHeadshot: false,
            headshotPath: null,
          });
        }
      }
      
      // Show progress every 100 actresses
      if (actresses.indexOf(actress) % 100 === 0 && actresses.indexOf(actress) > 0) {
        console.log(`Processed ${actresses.indexOf(actress)}/${actresses.length} actresses...`);
      }
    }
    
    console.log(`\n📊 RESULTS\n${'='.repeat(80)}\n`);
    console.log(`Total actresses checked: ${actresses.length}`);
    console.log(`Actresses using first gallery image as headshot: ${actressesUsingFirstGallery.length}\n`);
    
    if (actressesUsingFirstGallery.length > 0) {
      console.log('LIST OF ACTRESSES USING FIRST GALLERY IMAGE AS HEADSHOT:\n');
      console.log(`${'ID'.padEnd(6)} | ${'Name'.padEnd(40)} | Gallery Image ID | Path`);
      console.log('-'.repeat(80));
      
      actressesUsingFirstGallery.forEach(actress => {
        const galleryId = actress.firstGalleryImageId?.toString() || 'N/A';
        const pathPreview = actress.firstGalleryImagePath 
          ? (actress.firstGalleryImagePath.length > 50 
              ? actress.firstGalleryImagePath.substring(0, 47) + '...' 
              : actress.firstGalleryImagePath)
          : 'N/A';
        
        console.log(
          `${actress.id.toString().padEnd(6)} | ${actress.name.padEnd(40)} | ${galleryId.padEnd(16)} | ${pathPreview}`
        );
      });
      
      // Also output as JSON for easier processing
      console.log('\n\n📋 JSON OUTPUT (for easy processing):\n');
      console.log(JSON.stringify(actressesUsingFirstGallery, null, 2));
      
      // Summary by ID ranges
      console.log('\n\n📊 SUMMARY BY ID RANGES:\n');
      const sortedById = [...actressesUsingFirstGallery].sort((a, b) => a.id - b.id);
      const minId = sortedById[0]?.id || 0;
      const maxId = sortedById[sortedById.length - 1]?.id || 0;
      console.log(`ID Range: ${minId} - ${maxId}`);
      console.log(`Total count: ${actressesUsingFirstGallery.length}`);
    } else {
      console.log('✅ All actresses have proper headshots!');
    }
    
    return actressesUsingFirstGallery;
  } catch (error: any) {
    console.error('Error finding actresses:', error);
    throw error;
  }
}

findActressesUsingFirstGalleryAsHeadshot()
  .then((results) => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });


