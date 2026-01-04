interface Env {
  DB: D1Database;
}

interface GardenItemSync {
  id: string;
  itemId: string;
  type: string;
  positionX: number;
  positionY: number;
  earnedFor: string | null;
  earnedAt: number | null;
}

interface GardenStatsSync {
  coins: number;
  unlockedThemes: string[];
  currentTheme: string;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const profileId = params.id as string;
  const { items, stats } = await request.json<{ items: GardenItemSync[]; stats: GardenStatsSync }>();
  await env.DB.prepare(`DELETE FROM garden_items WHERE profile_id = ?`).bind(profileId).run();
  if (items.length > 0) {
    const stmt = env.DB.prepare(
      `INSERT INTO garden_items (id, profile_id, item_id, type, position_x, position_y, earned_for, earned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const batch = items.map((item) =>
      stmt.bind(item.id, profileId, item.itemId, item.type, item.positionX, item.positionY, item.earnedFor, item.earnedAt)
    );
    await env.DB.batch(batch);
  }
  await env.DB.prepare(
    `INSERT OR REPLACE INTO profile_stats (profile_id, coins, unlocked_themes, current_theme) VALUES (?, ?, ?, ?)`
  ).bind(profileId, stats.coins, JSON.stringify(stats.unlockedThemes), stats.currentTheme).run();
  return new Response(null, { status: 204 });
};
