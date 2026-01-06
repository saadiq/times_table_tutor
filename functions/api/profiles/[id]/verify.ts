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

  // Fetch associated data
  const { results: facts } = await env.DB.prepare(
    `SELECT fact, confidence, correct_count as correctCount, incorrect_count as incorrectCount,
     last_seen as lastSeen, last_correct as lastCorrect, recent_attempts as recentAttempts,
     preferred_strategy as preferredStrategy FROM fact_progress WHERE profile_id = ?`
  ).bind(id).all();

  const { results: gardenItems } = await env.DB.prepare(
    `SELECT id, item_id as itemId, type, position_x as positionX, position_y as positionY,
     earned_for as earnedFor, earned_at as earnedAt FROM garden_items WHERE profile_id = ?`
  ).bind(id).all();

  const stats = await env.DB.prepare(
    `SELECT coins, unlocked_themes as unlockedThemes, current_theme as currentTheme
     FROM profile_stats WHERE profile_id = ?`
  ).bind(id).first() || { coins: 0, unlockedThemes: '["flower"]', currentTheme: 'flower' };

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
  });
};
