/**
 * Script to automatically find related actresses based on:
 * - Same movies/films
 * - Same partners/men (theirman field)
 * - Same birth year
 * - Same era (already implemented)
 * - Similar timeline events
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'glamourgirls',
  waitForConnections: true,
  connectionLimit: 10,
});

interface Actress {
  id: number;
  name: string;
  slug: string;
  godini: number;
  theirman: number;
  birthYear: number | null;
  timeline: Array<{ date: string; event: string }>;
  movies: string[];
  partners: string[];
}

interface RelatedActress {
  actressId: number;
  relatedId: number;
  reason: string;
  score: number;
}

/**
 * Extract birth year from timeline text only
 */
function extractBirthYear(timeline: Array<{ date: string; event: string }>): number | null {
  // Look for birth events in timeline
  for (const item of timeline) {
    const text = `${item.date} ${item.event}`.toLowerCase();
    if (text.includes('born') || text.includes('birth')) {
      const yearMatch = text.match(/(18|19|20)\d{2}/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        // Validate year is reasonable (1800-2020)
        if (year >= 1800 && year <= 2020) {
          return year;
        }
      }
    }
  }

  // Try first timeline entry (often contains birth info)
  if (timeline.length > 0) {
    const firstText = `${timeline[0].date} ${timeline[0].event}`;
    const yearMatch = firstText.match(/(18|19|20)\d{2}/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      // Validate year is reasonable (1800-2020)
      if (year >= 1800 && year <= 2020) {
        return year;
      }
    }
  }

  // Try to find earliest year in timeline (might be birth year)
  let earliestYear: number | null = null;
  for (const item of timeline) {
    const text = `${item.date} ${item.event}`;
    const yearMatches = text.matchAll(/(18|19|20)\d{2}/g);
    for (const match of yearMatches) {
      const year = parseInt(match[0], 10);
      if (year >= 1800 && year <= 2020) {
        if (!earliestYear || year < earliestYear) {
          earliestYear = year;
        }
      }
    }
  }

  // If earliest year is before 1930, it's likely a birth year
  if (earliestYear && earliestYear < 1930) {
    return earliestYear;
  }

  return null;
}

/**
 * Extract movie/film titles from timeline
 */
function extractMovies(timeline: Array<{ date: string; event: string }>): string[] {
  const movies: string[] = [];
  const moviePatterns = [
    // Patterns for movie titles in quotes
    /["']([^"']{3,50})["']/g,
    // Patterns with movie keywords
    /(?:starred?|appeared?|featured?|played|cast|in)\s+(?:the\s+)?(?:film|movie|picture|feature)\s+["']?([^"',.?!]{3,50})["']?/gi,
    /(?:film|movie|picture|feature)\s+["']?([^"',.?!]{3,50})["']?/gi,
    // Patterns with "in" followed by title
    /\bin\s+["']([^"']{3,50})["']/gi,
  ];

  const excludeWords = ['the', 'a', 'an', 'her', 'his', 'she', 'he', 'they', 'this', 'that'];

  for (const item of timeline) {
    const text = `${item.date} ${item.event}`;
    
    for (const pattern of moviePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          let movie = match[1].trim();
          
          // Clean up common prefixes
          movie = movie.replace(/^(the|a|an)\s+/i, '');
          
          // Filter out common false positives
          if (movie.length >= 3 && 
              movie.length <= 50 &&
              !excludeWords.includes(movie.toLowerCase()) &&
              !movie.match(/^\d+$/) && // Not just numbers
              movie.match(/[a-zA-Z]/)) { // Contains letters
            movies.push(movie);
          }
        }
      }
    }
  }

  // Remove duplicates and return
  return [...new Set(movies)];
}

/**
 * Extract partner/man names from timeline
 */
function extractPartners(timeline: Array<{ date: string; event: string }>, theirman: number): string[] {
  const partners: string[] = [];
  
  // If theirman is set, look for mentions in timeline
  if (theirman === 1) {
    const partnerPatterns = [
      /(?:married|wed|engaged|dating|romance|relationship|partner|husband|boyfriend)\s+(?:to\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
      /(?:with\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    ];

    for (const item of timeline) {
      const text = `${item.date} ${item.event}`;
      
      for (const pattern of partnerPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const partner = match[1].trim();
            // Filter out common words
            if (partner.length > 2 && 
                !['The', 'A', 'An', 'She', 'He', 'Her', 'His'].includes(partner)) {
              partners.push(partner);
            }
          }
        }
      }
    }
  }

  return [...new Set(partners)]; // Remove duplicates
}

/**
 * Find related actresses for a given actress
 */
async function findRelatedActresses(actress: Actress): Promise<RelatedActress[]> {
  const related: RelatedActress[] = [];
  const reasons: string[] = [];

  // 1. Same era (already implemented, but we'll include it)
  if (actress.godini) {
    const [sameEra] = await pool.execute(
      `SELECT id, nm, slug, godini 
       FROM girls 
       WHERE published = 2 
         AND godini = ? 
         AND id != ? 
       LIMIT 10`,
      [actress.godini, actress.id]
    ) as any[];

    for (const row of sameEra) {
      related.push({
        actressId: actress.id,
        relatedId: row.id,
        reason: `Same era (${actress.godini})`,
        score: 1,
      });
    }
  }

  // 2. Same birth year
  if (actress.birthYear) {
    // Find actresses with similar birth years (±2 years)
    const [sameBirthYear] = await pool.execute(
      `SELECT DISTINCT g.id, g.nm, g.slug, g.godini
       FROM girls g
       LEFT JOIN girlinfos gi ON g.id = gi.girlid
       WHERE g.published = 2 
         AND g.id != ?
         AND (
           gi.lngtext LIKE ? 
           OR gi.shrttext LIKE ?
         )
       LIMIT 10`,
      [actress.id, `%${actress.birthYear}%`, `%${actress.birthYear}%`]
    ) as any[];

    for (const row of sameBirthYear) {
      // Check if already added
      if (!related.some(r => r.relatedId === row.id)) {
        related.push({
          actressId: actress.id,
          relatedId: row.id,
          reason: `Same birth year (${actress.birthYear})`,
          score: 2,
        });
      }
    }
  }

  // 3. Same movies
  if (actress.movies.length > 0) {
    for (const movie of actress.movies.slice(0, 5)) { // Limit to first 5 movies
      const [sameMovie] = await pool.execute(
        `SELECT DISTINCT g.id, g.nm, g.slug, g.godini
         FROM girls g
         INNER JOIN girlinfos gi ON g.id = gi.girlid
         WHERE g.published = 2 
           AND g.id != ?
           AND (
             gi.lngtext LIKE ? 
             OR gi.shrttext LIKE ?
           )
         LIMIT 5`,
        [actress.id, `%${movie}%`, `%${movie}%`]
      ) as any[];

      for (const row of sameMovie) {
        // Check if already added
        const existing = related.find(r => r.relatedId === row.id);
        if (existing) {
          existing.score += 2; // Increase score if multiple connections
          existing.reason += `, Same movie: ${movie}`;
        } else {
          related.push({
            actressId: actress.id,
            relatedId: row.id,
            reason: `Same movie: ${movie}`,
            score: 2,
          });
        }
      }
    }
  }

  // 4. Same partners (theirman)
  if (actress.partners.length > 0 && actress.theirman === 1) {
    for (const partner of actress.partners.slice(0, 3)) { // Limit to first 3 partners
      const [samePartner] = await pool.execute(
        `SELECT DISTINCT g.id, g.nm, g.slug, g.godini
         FROM girls g
         INNER JOIN girlinfos gi ON g.id = gi.girlid
         WHERE g.published = 2 
           AND g.theirman = 1
           AND g.id != ?
           AND (
             gi.lngtext LIKE ? 
             OR gi.shrttext LIKE ?
           )
         LIMIT 5`,
        [actress.id, `%${partner}%`, `%${partner}%`]
      ) as any[];

      for (const row of samePartner) {
        // Check if already added
        const existing = related.find(r => r.relatedId === row.id);
        if (existing) {
          existing.score += 3; // Higher score for partner connections
          existing.reason += `, Same partner: ${partner}`;
        } else {
          related.push({
            actressId: actress.id,
            relatedId: row.id,
            reason: `Same partner: ${partner}`,
            score: 3,
          });
        }
      }
    }
  }

  // Sort by score (highest first) and return top 10
  return related
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/**
 * Create related_actresses table if it doesn't exist
 */
async function createRelatedActressesTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS related_actresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actress_id INT NOT NULL,
        related_id INT NOT NULL,
        reason TEXT,
        score INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_relation (actress_id, related_id),
        INDEX idx_actress_id (actress_id),
        INDEX idx_related_id (related_id),
        INDEX idx_score (score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Related actresses table ready');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

/**
 * Main function to process all actresses
 */
async function main() {
  try {
    console.log('🚀 Starting related actresses discovery...\n');

    // Create table
    await createRelatedActressesTable();

    // Get all published actresses
    const [actresses] = await pool.execute(
      `SELECT id, nm, slug, godini, theirman
       FROM girls 
       WHERE published = 2 
       ORDER BY id ASC`
    ) as any[];

    console.log(`📊 Found ${actresses.length} published actresses\n`);

    let processed = 0;
    let totalRelations = 0;

    for (const actressRow of actresses) {
      processed++;
      console.log(`\n[${processed}/${actresses.length}] Processing: ${actressRow.nm} (ID: ${actressRow.id})`);

      // Fetch timeline
      const [timelineRows] = await pool.execute(
        `SELECT shrttext as date, lngtext as event 
         FROM girlinfos 
         WHERE girlid = ? 
         ORDER BY ord ASC`,
        [actressRow.id]
      ) as any[];

      const timeline = Array.isArray(timelineRows) 
        ? timelineRows.map((row: any) => ({ date: row.date || '', event: row.event || '' }))
        : [];

      // Extract information
      const birthYear = extractBirthYear(timeline);
      const movies = extractMovies(timeline);
      const partners = extractPartners(timeline, actressRow.theirman);

      const actress: Actress = {
        id: actressRow.id,
        name: actressRow.nm,
        slug: actressRow.slug || `${actressRow.id}`,
        godini: actressRow.godini,
        theirman: actressRow.theirman,
        birthYear,
        timeline,
        movies,
        partners,
      };

      console.log(`  📅 Birth year: ${birthYear || 'unknown'}`);
      console.log(`  🎬 Movies found: ${movies.length}`);
      console.log(`  💑 Partners found: ${partners.length}`);

      // Find related actresses
      const related = await findRelatedActresses(actress);

      if (related.length > 0) {
        console.log(`  ✅ Found ${related.length} related actresses`);

        // Clear existing relations for this actress
        await pool.execute(
          `DELETE FROM related_actresses WHERE actress_id = ?`,
          [actress.id]
        );

        // Insert new relations
        for (const relation of related) {
          await pool.execute(
            `INSERT INTO related_actresses (actress_id, related_id, reason, score)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               reason = VALUES(reason),
               score = VALUES(score),
               updated_at = CURRENT_TIMESTAMP`,
            [relation.actressId, relation.relatedId, relation.reason, relation.score]
          );
        }

        totalRelations += related.length;
        console.log(`  💾 Saved ${related.length} relations`);
      } else {
        console.log(`  ⚠️  No related actresses found`);
      }
    }

    console.log(`\n\n✨ Done!`);
    console.log(`📊 Processed: ${processed} actresses`);
    console.log(`🔗 Total relations: ${totalRelations}`);
    console.log(`\n💡 You can now update the API to use related_actresses table`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
main();

