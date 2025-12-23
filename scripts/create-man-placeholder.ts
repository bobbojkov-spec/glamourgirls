import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

/**
 * Create a simple placeholder portrait image for "their men" category
 * This is a generic male portrait silhouette
 */
async function createManPlaceholder() {
  // Match thumbnail proportions: 3:4 aspect ratio (like w-12 h-16 in Tailwind = 48px:64px = 3:4)
  const width = 300;
  const height = 400; // 3:4 ratio
  
  // Create a simple SVG for a male portrait silhouette
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#d4a574"/>
      
      <!-- Head (circle) -->
      <circle cx="${width/2}" cy="${height*0.25}" r="${width*0.15}" fill="#8b6f47" opacity="0.8"/>
      
      <!-- Body (rounded rectangle) -->
      <rect x="${width*0.3}" y="${height*0.4}" width="${width*0.4}" height="${height*0.5}" rx="${width*0.05}" fill="#8b6f47" opacity="0.8"/>
      
      <!-- Tie or simple detail -->
      <rect x="${width*0.45}" y="${height*0.4}" width="${width*0.1}" height="${height*0.3}" fill="#6b5433" opacity="0.6"/>
    </svg>
  `;

  // Convert SVG to PNG using sharp
  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
    .resize(width, height)
    .toBuffer();

  // Save to public/images
  const outputPath = path.join(process.cwd(), 'public', 'images', 'placeholder-man-portrait.png');
  await fs.writeFile(outputPath, pngBuffer);

  console.log(`✅ Created placeholder man portrait: ${outputPath}`);
  console.log(`   Size: ${width}x${height}px`);
}

// Run if called directly
if (require.main === module) {
  createManPlaceholder()
    .then(() => {
      console.log('\n✨ Success!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

export default createManPlaceholder;

