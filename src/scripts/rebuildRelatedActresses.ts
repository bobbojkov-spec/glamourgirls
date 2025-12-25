import { Pool } from "pg";
import { getPool } from "@/lib/db";

const MAX_RELATED = 6;
const SIM_THRESHOLD = 0.25;

// Create a pool for standalone execution
let standalonePool: Pool | null = null;
function getStandalonePool(): Pool {
  if (!standalonePool) {
    standalonePool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return standalonePool;
}

type Reason = {
  type: string;
  value?: any;
  weight: number;
};

function normalizeText(...parts: (string | null)[]) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function buildReasons(sim: number, nameMatch: boolean): Reason[] {
  const reasons: Reason[] = [];

  if (sim >= SIM_THRESHOLD) {
    reasons.push({
      type: "text_similarity",
      value: sim,
      weight: Math.min(sim, 0.4),
    });
  }



  if (nameMatch) {
    reasons.push({
      type: "name_mention",
      weight: 0.5,
    });
  }

  return reasons;
}

export type RelationPreview = {
  actress_id: number;
  actress_name: string;
  related_id: number;
  related_name: string;
  score: number;
  reasons: Reason[];
};

export type RebuildResult = {
  processed: number;
  totalRelations: number;
  preview?: RelationPreview[];
};

export async function rebuildRelatedActresses(options?: {
  preview?: boolean;
  pool?: Pool;
}): Promise<RebuildResult> {
  // Use provided pool (from API route) or create standalone pool (for direct execution)
  const pool = options?.pool || getStandalonePool();
  
  const girlsRes = await pool.query(`
    SELECT
      id,
      nm,
      firstname,
      middlenames,
      familiq,
      introtext,
      sources,
      metadescription,
      ogdescription
    FROM girls
    WHERE published = 2
  `);

  const girls = girlsRes.rows;
  const previewData: RelationPreview[] = [];
  let totalRelations = 0;

  for (const g of girls) {
    const baseText = normalizeText(
      g.introtext,
      g.sources,
      g.metadescription,
      g.ogdescription
    );

    if (!baseText) continue;

    const candidatesRes = await pool.query(
      `
      SELECT
        id,
        nm,
        firstname,
        middlenames,
        familiq,
        similarity(
          concat_ws(' ',
            introtext,
            sources,
            metadescription,
            ogdescription
          ),
          $1
        ) AS sim
      FROM girls
      WHERE id <> $2
        AND published = 2
        AND similarity(
          concat_ws(' ',
            introtext,
            sources,
            metadescription,
            ogdescription
          ),
          $1
        ) > $3
      ORDER BY sim DESC
      LIMIT 20
      `,
      [baseText, g.id, SIM_THRESHOLD]
    );

    const actressName = `${g.firstname} ${g.middlenames} ${g.familiq}`.replace(/\s+/g, " ").trim() || g.nm || `ID ${g.id}`;

    const relations = candidatesRes.rows
      .map((c) => {
        const fullName =
          `${c.firstname} ${c.middlenames} ${c.familiq}`.replace(/\s+/g, " ").trim();

        const nameMatch =
          fullName.length > 5 &&
          baseText.includes(fullName.toLowerCase());

        const reasons = buildReasons(c.sim, nameMatch);
        const score = reasons.reduce((s, r) => s + r.weight, 0);

        const relatedName = fullName || c.nm || `ID ${c.id}`;

        return {
          actress_id: g.id,
          actress_name: actressName,
          related_id: c.id,
          related_name: relatedName,
          score,
          reasons,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RELATED);

    if (options?.preview) {
      previewData.push(...relations);
      totalRelations += relations.length;
    } else {
      for (const r of relations) {
        await pool.query(
          `
          INSERT INTO related_actresses (actress_id, related_id, score, reasons)
          VALUES ($1, $2, $3, $4::jsonb)
          ON CONFLICT (actress_id, related_id)
          DO UPDATE SET
            score = EXCLUDED.score,
            reasons = EXCLUDED.reasons,
            updated_at = NOW()
          `,
          [r.actress_id, r.related_id, r.score, JSON.stringify(r.reasons)]
        );
        totalRelations++;
      }
    }
  }

  const result: RebuildResult = {
    processed: girls.length,
    totalRelations,
  };

  if (options?.preview) {
    result.preview = previewData;
  }

  return result;
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  rebuildRelatedActresses({ preview: false })
    .then(() => {
      console.log("✅ Related actresses rebuilt");
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
