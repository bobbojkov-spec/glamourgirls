/**
 * Script to auto-generate SEO data for ALL actresses using the API endpoint
 * This simulates clicking "Auto-Generate" and "Save" for each entry
 * Run: npx tsx scripts/auto-generate-seo-all-api.ts
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function autoGenerateSEOForAllViaAPI() {
  try {
    console.log('Fetching all actress IDs...');
    
    // First, get all actress IDs
    const response = await fetch(`${baseUrl}/api/admin/girls`);
    if (!response.ok) {
      throw new Error('Failed to fetch actresses');
    }
    
    const actresses = await response.json();
    console.log(`Found ${actresses.length} actresses to process\n`);

    let updated = 0;
    let errors = 0;
    const statusCounts = { red: 0, yellow: 0, green: 0 };

    for (let i = 0; i < actresses.length; i++) {
      const actress = actresses[i];
      const progress = `[${i + 1}/${actresses.length}]`;
      
      try {
        // Call the auto-generate API endpoint (simulates clicking "Auto-Generate")
        const generateResponse = await fetch(`${baseUrl}/api/admin/girls/${actress.id}/seo/auto-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!generateResponse.ok) {
          const error = await generateResponse.json();
          throw new Error(error.error || 'Failed to generate');
        }

        const generateData = await generateResponse.json();
        const seoData = generateData.seoData;
        
        // Now save it (simulates clicking "Save SEO")
        const saveResponse = await fetch(`${baseUrl}/api/admin/girls/${actress.id}/seo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(seoData),
        });

        if (!saveResponse.ok) {
          const error = await saveResponse.json();
          throw new Error(error.error || 'Failed to save');
        }

        statusCounts[seoData.seoStatus]++;
        updated++;
        
        // Show progress every 10 entries
        if ((i + 1) % 10 === 0) {
          console.log(`${progress} ✓ ${actress.name || actress.nm} (ID: ${actress.id}) - Status: ${seoData.seoStatus.toUpperCase()}`);
        }
      } catch (error: any) {
        errors++;
        console.error(`${progress} ✗ Error processing ${actress.name || actress.nm} (ID: ${actress.id}):`, error.message);
      }
    }

    console.log(`\n✅ Completed!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${actresses.length}`);
    console.log(`\nStatus Breakdown:`);
    console.log(`   Green: ${statusCounts.green}`);
    console.log(`   Yellow: ${statusCounts.yellow}`);
    console.log(`   Red: ${statusCounts.red}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

autoGenerateSEOForAllViaAPI();

