import { validateProfileFields } from '../../_shared/profileEdits';

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // A truncated or non-JSON body has to reach the validator's 400. Left
    // unhandled it escapes the handler and Pages answers with a 500 HTML page,
    // which the client can only render as its generic "try again".
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }

  const validation = validateProfileFields(body);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { name, icon, color } = validation.fields;

  // Check for existing name (case-insensitive)
  const existing = await env.DB.prepare(
    `SELECT id FROM profiles WHERE name = ? COLLATE NOCASE`
  ).bind(name).first();

  if (existing) {
    return Response.json({ error: 'Name already taken' }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  try {
    // One batch, so a failed stats insert takes the profile row with it rather
    // than leaving a profile nobody can accrue coins against. idx_profiles_name_unique
    // is the real guard on the name; the SELECT above only avoids depending on
    // an error string when there is no race between check and write.
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO profiles (id, name, icon, color, created_at, last_active)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, name, icon, color, now, now),
      env.DB.prepare(
        `INSERT INTO profile_stats (profile_id) VALUES (?)`
      ).bind(id),
    ]);
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return Response.json({ error: 'Name already taken' }, { status: 409 });
    }
    throw err;
  }

  return Response.json({
    id, name, icon, color, createdAt: now, lastActive: now,
  });
};
