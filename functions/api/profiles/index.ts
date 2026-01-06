interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, name, color, last_active as lastActive
     FROM profiles
     ORDER BY last_active DESC
     LIMIT 20`
  ).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { name, icon, color } = await request.json<{
    name: string;
    icon: string;
    color: string;
  }>();
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO profiles (id, name, icon, color, created_at, last_active)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, icon, color, now, now).run();
  await env.DB.prepare(
    `INSERT INTO profile_stats (profile_id) VALUES (?)`
  ).bind(id).run();
  return Response.json({
    id, name, icon, color, createdAt: now, lastActive: now,
  });
};
