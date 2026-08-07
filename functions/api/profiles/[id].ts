import { validateProfileEdit } from '../../_shared/profileEdits';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({ error: 'Use POST /api/profiles/{id}/verify to access profile' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;
  await env.DB.prepare(`DELETE FROM profiles WHERE id = ?`).bind(id).run();
  return new Response(null, { status: 204 });
};

export const onRequestPatch: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = params.id as string;
  const validation = validateProfileEdit(await request.json());
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { currentIcon, name, icon, color } = validation.edit;

  // created_at/last_active come along here so the success response can be
  // assembled locally: this endpoint writes only name/icon/color, so after the
  // UPDATE every field of the row is already known.
  const profile = await env.DB.prepare(
    `SELECT icon, created_at as createdAt, last_active as lastActive
     FROM profiles WHERE id = ?`
  ).bind(id).first<{ icon: string; createdAt: string; lastActive: string }>();

  if (!profile) {
    return new Response('Profile not found', { status: 404 });
  }

  // Same check, same status, same body shape as /verify: one status code, one
  // meaning, so the client maps 401 to "wrong icon" wherever it sees it.
  if (profile.icon !== currentIcon) {
    return Response.json({ error: 'Incorrect icon' }, { status: 401 });
  }

  const taken = await env.DB.prepare(
    `SELECT id FROM profiles WHERE name = ? COLLATE NOCASE AND id != ?`
  ).bind(name, id).first();

  if (taken) {
    return Response.json({ error: 'Name already taken' }, { status: 409 });
  }

  try {
    // last_active is deliberately untouched: editing a profile is not a
    // sign-in, and the picker orders by it.
    await env.DB.prepare(
      `UPDATE profiles SET name = ?, icon = ?, color = ? WHERE id = ?`
    ).bind(name, icon, color, id).run();
  } catch (err) {
    // idx_profiles_name_unique is the real guard; the SELECT above only buys a
    // friendlier message when there is no race between check and write.
    if (String(err).includes('UNIQUE')) {
      return Response.json({ error: 'Name already taken' }, { status: 409 });
    }
    throw err;
  }

  return Response.json({
    id,
    name,
    icon,
    color,
    createdAt: profile.createdAt,
    lastActive: profile.lastActive,
  });
};
