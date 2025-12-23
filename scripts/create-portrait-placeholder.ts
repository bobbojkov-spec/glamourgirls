import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

/**
 * Create a simple placeholder portrait image for actresses without photos
 * This is a generic portrait silhouette
 */
async function createPortraitPlaceholder() {
  // Match thumbnail proportions: 3:4 aspect ratio (like w-12 h-16 in Tailwind = 48px:64px = 3:4)
  const width = 300;
  const height = 400; // 3:4 ratio
  
  // Create a simple SVG for a portrait silhouette
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#e8d5b7"/>
      
      <!-- Head (circle) -->
      <circle cx="${width/2}" cy="${height*0.2}" r="${width*0.18}" fill="#c4a574" opacity="0.7"/>
      
      <!-- Body (rounded rectangle) -->
      <rect x="${width*0.25}" y="${height*0.35}" width="${width*0.5}" height="${height*0.55}" rx="${width*0.08}" fill="#c4a574" opacity="0.7"/>
      
      <!-- Simple detail -->
      <ellipse cx="${width/2}" cy="${height*0.25}" rx="${width*0.08}" ry="${width*0.12}" fill="#a68d5f" opacity="0.5"/>
    </svg>
  `;

  // Convert SVG to PNG using sharp
  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
    .resize(width, height)
    .toBuffer();

  // Save to public/images
  const outputPath = path.join(process.cwd(), 'public', 'images', 'placeholder-portrait.png');
  await fs.writeFile(outputPath, pngBuffer);

  console.log(`✅ Created placeholder portrait: ${outputPath}`);
  console.log(`   Size: ${width}x${height}px`);
}

// Run if called directly
if (require.main === module) {
  createPortraitPlaceholder()
    .then(() => {
      console.log('\n✨ Success!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

export default createPortraitPlaceholder;

