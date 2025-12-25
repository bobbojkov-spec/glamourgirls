import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // First, get distinct "their men" entries (limit to 30 people)
    const [peopleResults] = await pool.execute(
      `SELECT DISTINCT g.id, g.nm, g.firstname, g.familiq, g.slug, g.theirman
      FROM girls g
      WHERE g.published = 2 
        AND g.theirman = true
      ORDER BY g.familiq, g.firstname
      LIMIT 30`
    ) as any[];

    if (!Array.isArray(peopleResults) || peopleResults.length === 0) {
      return NextResponse.json([]);
    }

    // Extract person IDs
    const personIds = peopleResults.map((row: any) => Number(row.id));

    // Now fetch timeline data for these specific people (if we have IDs)
    let timelineResults: any[] = [];
    if (personIds.length > 0) {
      const [results] = await pool.execute(
        `SELECT gi.girlid, gi.shrttext, gi.lngtext
        FROM girlinfos gi
        WHERE gi.girlid IN (${personIds.map(() => '?').join(',')})`
      , personIds) as any[];
      timelineResults = Array.isArray(results) ? results : [];
    }

    // Create a map of person ID to timeline entries
    const timelineMap = new Map<number, any[]>();
    timelineResults.forEach((row: any) => {
      const id = Number(row.girlid);
      if (!timelineMap.has(id)) {
        timelineMap.set(id, []);
      }
      timelineMap.get(id)!.push(row);
    });

    // Combine people with their timeline data
    const results = peopleResults.map((person: any) => {
      const timelines = timelineMap.get(Number(person.id)) || [];
      return {
        ...person,
        timelines,
      };
    });

    // Process results and extract descriptions
    const men = results.map((row: any) => {
      const id = Number(row.id);
      // Generate slug if not present
      let slug = row.slug;
      if (!slug) {
        slug = `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }

      // Extract description from first timeline entry with content
      let description = '';
      if (row.timelines && row.timelines.length > 0) {
        const firstTimeline = row.timelines.find((t: any) => t.lngtext);
        if (firstTimeline && firstTimeline.lngtext) {
          const text = String(firstTimeline.lngtext || '');
          // Remove common prefixes and extract key words
          const words = text
            .replace(/^(born|died|was|is|are|were|became|married|divorced|worked|starred|appeared|known|famous|notable|celebrated|renowned|legendary|iconic|distinguished|prominent|esteemed|acclaimed|venerated|honored|respected|admired|beloved|cherished|treasured|revered|glorified|exalted|lauded|praised|commended|applauded|recognized|acknowledged|credited|attributed|ascribed|assigned|designated|named|called|termed|labeled|tagged|identified|classified|categorized|grouped|sorted|organized|arranged|ordered|ranked|rated|evaluated|assessed|judged|considered|regarded|viewed|seen|perceived|understood|interpreted|construed|explained|described|depicted|portrayed|represented|illustrated|exemplified|demonstrated|shown|displayed|exhibited|presented|revealed|disclosed|unveiled|exposed|uncovered|discovered|found|detected|noticed|observed|witnessed|seen|spotted|glimpsed|gazed|stared|looked|peered|glanced|peeked|stared|examined|inspected|scrutinized|analyzed|studied|investigated|researched|explored|searched|sought|hunted|tracked|traced|followed|pursued|chased|hunted|stalked|shadowed|trailed|tracked|monitored|watched|surveilled|supervised|oversaw|managed|controlled|directed|guided|led|conducted|performed|executed|carried|out|accomplished|achieved|attained|reached|obtained|gained|acquired|secured|procured|obtained|got|received|accepted|took|grabbed|seized|captured|snatched|nabbed|caught|arrested|apprehended|detained|held|kept|retained|maintained|preserved|conserved|protected|safeguarded|shielded|defended|guarded|secured|saved|rescued|liberated|freed|released|let|go|allowed|permitted|authorized|approved|sanctioned|endorsed|supported|backed|sponsored|funded|financed|paid|for|covered|compensated|reimbursed|refunded|repaid|returned|restored|reinstated|reestablished|rebuilt|reconstructed|recreated|reproduced|replicated|duplicated|copied|imitated|mimicked|emulated|mirrored|reflected|echoed|repeated|reiterated|restated|rephrased|paraphrased|summarized|condensed|abbreviated|shortened|reduced|minimized|lessened|decreased|lowered|diminished|weakened|softened|eased|relaxed|loosened|slackened|relented|yielded|surrendered|gave|up|abandoned|deserted|forsook|left|departed|exited|withdrew|retreated|retired|resigned|quit|stopped|ceased|ended|finished|concluded|terminated|completed)\s+/i, '')
            .split(/\s+/)
            .filter((word: string) => word.length > 2)
            .slice(0, 3)
            .join(' ');

          if (words.length > 0) {
            description = words.charAt(0).toUpperCase() + words.slice(1);
          }
        }
      }

      return {
        id,
        name: String(row.nm || ''),
        firstName: String(row.firstname || ''),
        lastName: String(row.familiq || ''),
        slug,
        description: description || 'Notable figure',
      };
    });

    // For entries without descriptions, create a fallback
    men.forEach(man => {
      if (!man.description || man.description.length === 0) {
        // Use name or create a simple description
        man.description = 'Notable figure';
      }
    });

    // Shuffle and return 5 random entries (or all if less than 5 available)
    const shuffled = men.sort(() => Math.random() - 0.5);
    const result = shuffled.length >= 5 ? shuffled.slice(0, 5) : shuffled;
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching their men:', error);
    return NextResponse.json(
      { error: 'Failed to fetch their men entries' },
      { status: 500 }
    );
  }
}

