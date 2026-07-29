interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = params.id as string;
  const { icon } = await request.json<{ icon: string }>();

  // Get profile and check icon
  const profile = await env.DB.prepare(
    `SELECT id, name, icon, color, created_at as createdAt, last_active as lastActive
     FROM profiles WHERE id = ?`
  ).bind(id).first();

  if (!profile) {
    return new Response('Profile not found', { status: 404 });
  }

  if (profile.icon !== icon) {
    return new Response(
      JSON.stringify({ error: 'Incorrect icon' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Icon correct - update last_active and return full profile data
  await env.DB.prepare(
    `UPDATE profiles SET last_active = ? WHERE id = ?`
  ).bind(Date.now(), id).run();

  // Fetch associated data in parallel — sign-in is the hot path. The session
  // read alone is tolerated rather than required: sign-in is the one path a
  // child cannot get past, so a database that hasn't had the schema replayed
  // yet still lets them in with cold scene warmth instead of a 500.
  const [{ results: facts }, { results: gardenItems }, statsRow, sessionRows] = await Promise.all([
    env.DB.prepare(
      `SELECT fact, curriculum, confidence, correct_count as correctCount, incorrect_count as incorrectCount,
       skipped_count as skippedCount, last_seen as lastSeen, last_correct as lastCorrect, recent_attempts as recentAttempts,
       preferred_strategy as preferredStrategy FROM fact_progress WHERE profile_id = ?`
    ).bind(id).all(),
    env.DB.prepare(
      `SELECT id, item_id as itemId, type, position_x as positionX, position_y as positionY,
       earned_for as earnedFor, earned_at as earnedAt FROM garden_items WHERE profile_id = ?`
    ).bind(id).all(),
    env.DB.prepare(
      `SELECT coins, unlocked_themes as unlockedThemes, current_theme as currentTheme
       FROM profile_stats WHERE profile_id = ?`
    ).bind(id).first(),
    env.DB.prepare(
      `SELECT curriculum, sessions_completed as sessionsCompleted
       FROM profile_sessions WHERE profile_id = ?`
    ).bind(id).all().then(
      (r) => r.results as { curriculum: string; sessionsCompleted: number }[],
      (err) => {
        console.error('Failed to read session counts:', err);
        return [];
      }
    ),
  ]);

  const stats = statsRow || { coins: 0, unlockedThemes: '["flower"]', currentTheme: 'flower' };
  const sessions: Record<string, number> = {};
  for (const row of sessionRows) {
    sessions[row.curriculum] = row.sessionsCompleted;
  }

  return Response.json({
    profile,
    facts: facts.map((f: Record<string, unknown>) => ({
      ...f,
      recentAttempts: f.recentAttempts ? JSON.parse(f.recentAttempts as string) : [],
    })),
    gardenItems,
    stats: {
      coins: stats.coins,
      unlockedThemes: JSON.parse(stats.unlockedThemes as string || '["flower"]'),
      currentTheme: stats.currentTheme,
    },
    sessions,
  });
};
