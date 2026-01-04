interface Env {
  DB: D1Database;
}

interface FactSync {
  fact: string;
  confidence: string;
  correctCount: number;
  incorrectCount: number;
  lastSeen: number | null;
  lastCorrect: number | null;
  recentAttempts: boolean[];
  preferredStrategy: string | null;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const profileId = params.id as string;
  const { facts } = await request.json<{ facts: FactSync[] }>();
  const stmt = env.DB.prepare(
    `INSERT OR REPLACE INTO fact_progress
     (profile_id, fact, confidence, correct_count, incorrect_count, last_seen, last_correct, recent_attempts, preferred_strategy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const batch = facts.map((f) =>
    stmt.bind(profileId, f.fact, f.confidence, f.correctCount, f.incorrectCount,
      f.lastSeen, f.lastCorrect, JSON.stringify(f.recentAttempts), f.preferredStrategy)
  );
  await env.DB.batch(batch);
  return new Response(null, { status: 204 });
};
