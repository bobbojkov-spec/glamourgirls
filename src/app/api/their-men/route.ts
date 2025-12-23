import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Fetch "their men" entries with timeline data - get more to ensure we have enough with descriptions
    const [results] = await pool.execute(
      `SELECT g.id, g.nm, g.firstname, g.familiq, g.slug, g.theirman,
             gi.shrttext, gi.lngtext
      FROM girls g
      LEFT JOIN girlinfos gi ON g.id = gi.girlid
      WHERE g.published = 2 
        AND g.theirman = true
      ORDER BY g.familiq, g.firstname
      LIMIT 20`
    ) as any[];

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json([]);
    }

    // Group by person and extract description
    const menMap = new Map<number, {
      id: number;
      name: string;
      firstName: string;
      lastName: string;
      slug: string;
      description: string;
    }>();

    results.forEach((row: any) => {
      const id = Number(row.id);
      if (!menMap.has(id)) {
        // Generate slug if not present
        let slug = row.slug;
        if (!slug) {
          slug = `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }

        menMap.set(id, {
          id,
          name: String(row.nm || ''),
          firstName: String(row.firstname || ''),
          lastName: String(row.familiq || ''),
          slug,
          description: '',
        });
      }

      // Extract description from timeline content
      const entry = menMap.get(id)!;
      if (!entry.description && row.lngtext) {
        // Get first meaningful sentence or phrase (3 words)
        const text = String(row.lngtext || '');
        // Remove common prefixes and extract key words
        const words = text
          .replace(/^(born|died|was|is|are|were|became|married|divorced|worked|starred|appeared|known|famous|notable|celebrated|renowned|legendary|iconic|distinguished|prominent|esteemed|acclaimed|venerated|honored|respected|admired|beloved|cherished|treasured|revered|glorified|exalted|lauded|praised|commended|applauded|recognized|acknowledged|credited|attributed|ascribed|assigned|designated|named|called|termed|labeled|tagged|identified|classified|categorized|grouped|sorted|organized|arranged|ordered|ranked|rated|evaluated|assessed|judged|considered|regarded|viewed|seen|perceived|understood|interpreted|construed|explained|described|depicted|portrayed|represented|illustrated|exemplified|demonstrated|shown|displayed|exhibited|presented|revealed|disclosed|unveiled|exposed|uncovered|discovered|found|detected|noticed|observed|witnessed|seen|spotted|glimpsed|gazed|stared|looked|peered|glanced|peeked|stared|examined|inspected|scrutinized|analyzed|studied|investigated|researched|explored|searched|sought|hunted|tracked|traced|followed|pursued|chased|hunted|stalked|shadowed|trailed|tracked|monitored|watched|surveilled|supervised|oversaw|managed|controlled|directed|guided|led|conducted|performed|executed|carried|out|accomplished|achieved|attained|reached|obtained|gained|acquired|secured|procured|obtained|got|received|accepted|took|grabbed|seized|captured|snatched|nabbed|caught|arrested|apprehended|detained|held|kept|retained|maintained|preserved|conserved|protected|safeguarded|shielded|defended|guarded|secured|saved|rescued|liberated|freed|released|let|go|allowed|permitted|authorized|approved|sanctioned|endorsed|supported|backed|sponsored|funded|financed|paid|for|covered|compensated|reimbursed|refunded|repaid|returned|restored|reinstated|reestablished|rebuilt|reconstructed|recreated|reproduced|replicated|duplicated|copied|imitated|mimicked|emulated|mirrored|reflected|echoed|repeated|reiterated|restated|rephrased|paraphrased|summarized|condensed|abbreviated|shortened|reduced|minimized|lessened|decreased|lowered|diminished|weakened|softened|eased|relaxed|loosened|slackened|relented|yielded|surrendered|gave|up|abandoned|deserted|forsook|left|departed|exited|withdrew|retreated|retired|resigned|quit|stopped|ceased|ended|finished|concluded|terminated|completed|accomplished|achieved|attained|reached|obtained|gained|acquired|secured|procured|obtained|got|received|accepted|took|grabbed|seized|captured|snatched|nabbed|caught|arrested|apprehended|detained|held|kept|retained|maintained|preserved|conserved|protected|safeguarded|shielded|defended|guarded|secured|saved|rescued|liberated|freed|released|let|go|allowed|permitted|authorized|approved|sanctioned|endorsed|supported|backed|sponsored|funded|financed|paid|for|covered|compensated|reimbursed|refunded|repaid|returned|restored|reinstated|reestablished|rebuilt|reconstructed|recreated|reproduced|replicated|duplicated|copied|imitated|mimicked|emulated|mirrored|reflected|echoed|repeated|reiterated|restated|rephrased|paraphrased|summarized|condensed|abbreviated|shortened|reduced|minimized|lessened|decreased|lowered|diminished|weakened|softened|eased|relaxed|loosened|slackened|relented|yielded|surrendered|gave|up|abandoned|deserted|forsook|left|departed|exited|withdrew|retreated|retired|resigned|quit|stopped|ceased|ended|finished|concluded|terminated|completed)\s+/i, '')
          .split(/\s+/)
          .filter(word => word.length > 2)
          .slice(0, 3)
          .join(' ');

        if (words.length > 0) {
          entry.description = words.charAt(0).toUpperCase() + words.slice(1);
        }
      }
    });

    // Convert to array and ensure all entries have descriptions
    let men = Array.from(menMap.values());

    // For entries without descriptions, create a fallback
    men.forEach(man => {
      if (!man.description || man.description.length === 0) {
        // Use name or create a simple description
        man.description = 'Notable figure';
      }
    });

    // Return at least 3 entries (or all if less than 3 available)
    const result = men.length >= 3 ? men.slice(0, 3) : men;
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching their men:', error);
    return NextResponse.json(
      { error: 'Failed to fetch their men entries' },
      { status: 500 }
    );
  }
}

