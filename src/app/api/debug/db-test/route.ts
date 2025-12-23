import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const results: any = {
      connection: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'glamourgirls',
      },
      tableStructure: null,
      counts: {},
      samples: [],
      searchTest: {},
    };

    // Step 1: Get table structure
    try {
      const [columns] = await pool.execute(`SHOW COLUMNS FROM girls`) as any[];
      results.tableStructure = columns.map((col: any) => ({
        name: col.Field,
        type: col.Type,
        null: col.Null,
        key: col.Key,
      }));
    } catch (error: any) {
      results.tableStructureError = error.message;
    }

    // Step 2: Count records
    try {
      const [countAll] = await pool.execute(`SELECT COUNT(*) as total FROM girls`) as any[];
      results.counts.all = countAll[0]?.total || 0;

      const [countPublished] = await pool.execute(
        `SELECT COUNT(*) as total FROM girls WHERE published = 2`
      ) as any[];
      results.counts.published = countPublished[0]?.total || 0;
    } catch (error: any) {
      results.countsError = error.message;
    }

    // Step 3: Get sample records
    try {
      const [samples] = await pool.execute(
        `SELECT id, nm, firstname, familiq, published, slug 
         FROM girls 
         LIMIT 10`
      ) as any[];
      results.samples = samples.map((row: any) => ({
        id: row.id,
        nm: row.nm,
        firstname: row.firstname,
        familiq: row.familiq,
        published: row.published,
        slug: row.slug,
      }));
    } catch (error: any) {
      results.samplesError = error.message;
    }

    // Step 4: Test search query
    try {
      const keyword = 'adam';
      const keywordParam = `%${keyword}%`;
      
      const searchQuery = `
        SELECT g.id, g.nm, g.firstname, g.familiq
        FROM girls g
        WHERE g.published = 2
          AND (
            (g.nm IS NOT NULL AND LOWER(g.nm) LIKE LOWER(?)) OR 
            (g.firstname IS NOT NULL AND LOWER(g.firstname) LIKE LOWER(?)) OR 
            (g.familiq IS NOT NULL AND LOWER(g.familiq) LIKE LOWER(?))
          )
        LIMIT 10
      `;

      const [searchResults] = await pool.execute(searchQuery, [
        keywordParam,
        keywordParam,
        keywordParam,
      ]) as any[];

      results.searchTest = {
        keyword,
        query: searchQuery,
        params: [keywordParam, keywordParam, keywordParam],
        resultsCount: searchResults.length,
        results: searchResults.map((row: any) => ({
          id: row.id,
          nm: row.nm,
          firstname: row.firstname,
          familiq: row.familiq,
        })),
      };
    } catch (error: any) {
      results.searchTestError = error.message;
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

