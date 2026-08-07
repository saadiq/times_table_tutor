import { readJsonBody, validateProfileEdit } from '../../_shared/profileEdits';

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

  const validation = validateProfileEdit(await readJsonBody(request));
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { currentIcon, name, icon, color } = validation.edit;

  // name/created_at/last_active come along here so the success response can be
  // assembled locally and an unchanged name can skip the collision query: this
  // endpoint writes only name/icon/color, so after the UPDATE every field of
  // the row is already known.
  const profile = await env.DB.prepare(
    `SELECT name, icon, created_at as createdAt, last_active as lastActive
     FROM profiles WHERE id = ?`
  ).bind(id).first<{ name: string; icon: string; createdAt: string; lastActive: string }>();

  if (!profile) {
    return new Response('Profile not found', { status: 404 });
  }

  // Same check, same status, same body shape as /verify: one status code, one
  // meaning, so the client maps 401 to "wrong icon" wherever it sees it.
  if (profile.icon !== currentIcon) {
    return Response.json({ error: 'Incorrect icon' }, { status: 401 });
  }

  // Only a rename can collide. Checking a name the child never edited would
  // 409 forever on a profile that already shares its name with another row —
  // reachable while POST /api/profiles still races its own uniqueness check —
  // blocking icon and colour edits over a field they never touched.
  if (name.toLowerCase() !== profile.name.toLowerCase()) {
    const taken = await env.DB.prepare(
      `SELECT id FROM profiles WHERE name = ? COLLATE NOCASE AND id != ?`
    ).bind(name, id).first();

    if (taken) {
      return Response.json({ error: 'Name already taken' }, { status: 409 });
    }
  }

  let result: D1Result;
  try {
    // last_active is deliberately untouched: editing a profile is not a
    // sign-in, and the picker orders by it. The icon is repeated in the WHERE
    // clause so that a change committed by another device between the check
    // above and this write wins — without it, a request authorized against the
    // old icon silently reinstates it as the password.
    result = await env.DB.prepare(
      `UPDATE profiles SET name = ?, icon = ?, color = ? WHERE id = ? AND icon = ?`
    ).bind(name, icon, color, id, currentIcon).run();
  } catch (err) {
    // idx_profiles_name_unique is the real guard; the SELECT above only buys a
    // friendlier message when there is no race between check and write.
    if (String(err).includes('UNIQUE')) {
      return Response.json({ error: 'Name already taken' }, { status: 409 });
    }
    throw err;
  }

  if (result.meta.changes === 0) {
    return Response.json({ error: 'Incorrect icon' }, { status: 401 });
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
