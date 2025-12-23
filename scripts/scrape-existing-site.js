/**
 * Web Scraper for Glamour Girls Site
 * Extracts all actress data, images, meta tags, and content
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'https://www.glamourgirlsofthesilverscreen.com';
const OUTPUT_DIR = path.join(__dirname, '../data/scraped');

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'glamourgirls',
  waitForConnections: true,
  connectionLimit: 10,
});

/**
 * Fetch HTML from URL
 */
async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Extract meta tags from HTML
 */
function extractMetaTags(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  const getMeta = (name, attr = 'name') => {
    const meta = doc.querySelector(`meta[${attr}="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  };

  return {
    title: doc.querySelector('title')?.textContent || null,
    description: getMeta('description'),
    keywords: getMeta('keywords'),
    ogTitle: getMeta('og:title', 'property'),
    ogDescription: getMeta('og:description', 'property'),
    ogImage: getMeta('og:image', 'property'),
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
    h1: doc.querySelector('h1')?.textContent || null,
  };
}

/**
 * Extract actress data from profile page
 */
function extractActressData(html, url) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  // Extract name from title or H1
  const title = doc.querySelector('title')?.textContent || '';
  const h1 = doc.querySelector('h1')?.textContent || '';
  
  // Try to extract name from various patterns
  let name = h1 || title.split('|')[0]?.trim() || title.split('-')[0]?.trim() || '';
  
  // Extract biography/intro text
  const bioText = doc.querySelector('.actress-bio, .biography, #biography, .intro')?.textContent?.trim() || '';
  
  // Extract images
  const images = [];
  doc.querySelectorAll('img').forEach((img, index) => {
    const src = img.getAttribute('src') || img.getAttribute('data-src');
    if (src && !src.includes('logo') && !src.includes('icon')) {
      images.push({
        url: src.startsWith('http') ? src : new URL(src, url).href,
        alt: img.getAttribute('alt') || '',
        order: index,
      });
    }
  });

  // Extract timeline/bio events
  const timeline = [];
  doc.querySelectorAll('.timeline-row, .timeline-event, .bio-event').forEach((el) => {
    timeline.push(el.textContent?.trim() || '');
  });

  return {
    name,
    bioText,
    images,
    timeline,
  };
}

/**
 * Generate slug from name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Import actress data to database
 */
async function importActress(data, metaTags, oldUrl) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Check if actress already exists
    const [existing] = await connection.execute(
      'SELECT id FROM girls WHERE slug = ? OR old_url = ?',
      [data.slug, oldUrl]
    );

    let girlId;
    
    if (existing.length > 0) {
      // Update existing
      girlId = existing[0].id;
      await connection.execute(
        `UPDATE girls SET
          nm = ?,
          seo_title = ?,
          meta_description = ?,
          meta_keywords = ?,
          og_title = ?,
          og_description = ?,
          og_image = ?,
          canonical_url = ?,
          h1_title = ?,
          intro_text = ?,
          old_url = COALESCE(old_url, ?)
        WHERE id = ?`,
        [
          data.name,
          metaTags.title,
          metaTags.description,
          metaTags.keywords,
          metaTags.ogTitle,
          metaTags.ogDescription,
          metaTags.ogImage,
          metaTags.canonical,
          metaTags.h1,
          data.bioText,
          oldUrl,
          girlId,
        ]
      );
    } else {
      // Insert new
      const [result] = await connection.execute(
        `INSERT INTO girls (
          nm, slug, seo_title, meta_description, meta_keywords,
          og_title, og_description, og_image, canonical_url,
          h1_title, intro_text, old_url, published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          data.name,
          data.slug,
          metaTags.title,
          metaTags.description,
          metaTags.keywords,
          metaTags.ogTitle,
          metaTags.ogDescription,
          metaTags.ogImage,
          metaTags.canonical,
          metaTags.h1,
          data.bioText,
          oldUrl,
        ]
      );
      girlId = result.insertId;
    }

    // Import images
    for (const img of data.images) {
      await connection.execute(
        `INSERT INTO images (girlid, path, alt_text, display_order, mytp)
         VALUES (?, ?, ?, ?, 4)
         ON DUPLICATE KEY UPDATE alt_text = VALUES(alt_text)`,
        [girlId, img.url, img.alt, img.order]
      );
    }

    // Create redirect entry
    if (oldUrl) {
      await connection.execute(
        `INSERT INTO url_redirects (old_url, new_url, girlid, redirect_type)
         VALUES (?, ?, ?, 301)
         ON DUPLICATE KEY UPDATE new_url = VALUES(new_url)`,
        [oldUrl, `/actress/${girlId}/${data.slug}`, girlId]
      );
    }

    await connection.commit();
    return girlId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Main scraping function
 */
async function scrapeSite() {
  console.log('Starting site scrape...');
  
  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Example: Scrape index page to get list of actresses
  // You'll need to adapt this based on the actual site structure
  const indexHTML = await fetchHTML(`${BASE_URL}/index.html`);
  const indexDom = new JSDOM(indexHTML);
  const indexDoc = indexDom.window.document;

  // Extract all actress links
  const actressLinks = [];
  indexDoc.querySelectorAll('a[href*="/show/"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (href) {
      actressLinks.push(new URL(href, BASE_URL).href);
    }
  });

  console.log(`Found ${actressLinks.length} actress pages to scrape`);

  // Scrape each actress page
  for (let i = 0; i < actressLinks.length; i++) {
    const url = actressLinks[i];
    console.log(`[${i + 1}/${actressLinks.length}] Scraping: ${url}`);
    
    try {
      const html = await fetchHTML(url);
      const metaTags = extractMetaTags(html);
      const actressData = extractActressData(html, url);
      
      actressData.slug = generateSlug(actressData.name);
      
      const girlId = await importActress(actressData, metaTags, url);
      console.log(`  ✓ Imported: ${actressData.name} (ID: ${girlId})`);
      
      // Save HTML for reference
      await fs.writeFile(
        path.join(OUTPUT_DIR, `${girlId}-${actressData.slug}.html`),
        html
      );
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`  ✗ Error scraping ${url}:`, error.message);
    }
  }

  console.log('Scraping complete!');
  await pool.end();
}

// Run if called directly
if (require.main === module) {
  scrapeSite().catch(console.error);
}

module.exports = { scrapeSite, extractMetaTags, extractActressData };

