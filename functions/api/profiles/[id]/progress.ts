import { FACT_SKIP_ONLY_SQL, FACT_UPSERT_SQL, isSkipOnly } from '../../../_shared/progressSql';
import { normalizeCurriculum } from '../../../_shared/curriculum';

interface Env {
  DB: D1Database;
}

interface FactSync {
  fact: string;
  curriculum?: string;
  confidence: string;
  correctCount: number;
  incorrectCount: number;
  skippedCount?: number;
  lastSeen: number | null;
  lastCorrect: number | null;
  /**
   * Opaque attempt objects (RecentAttemptSync in src/types/api.ts, which this
   * file cannot import) — stored as a JSON blob, never inspected server-side.
   */
  recentAttempts: unknown[];
  preferredStrategy: string | null;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const profileId = params.id as string;
  const { facts } = await request.json<{ facts: FactSync[] }>();
  // D1 rejects an empty batch outright, so a no-op sync short-circuits here.
  if (!Array.isArray(facts) || facts.length === 0) {
    return new Response(null, { status: 204 });
  }
  // Two statements, same bind order: a snapshot carrying a last_seen replaces
  // the row when it is at least as fresh, while one without a last_seen (a skip
  // on a fact this device never answered) may only raise the skip tally.
  const upsert = env.DB.prepare(FACT_UPSERT_SQL);
  const skipOnly = env.DB.prepare(FACT_SKIP_ONLY_SQL);
  const batch = facts.map((f) =>
    (isSkipOnly(f.lastSeen) ? skipOnly : upsert).bind(
      profileId,
      f.fact,
      normalizeCurriculum(f.curriculum),
      f.confidence,
      f.correctCount,
      f.incorrectCount,
      f.skippedCount ?? 0,
      f.lastSeen ?? null,
      f.lastCorrect,
      JSON.stringify(f.recentAttempts),
      f.preferredStrategy
    )
  );
  await env.DB.batch(batch);
  return new Response(null, { status: 204 });
};
