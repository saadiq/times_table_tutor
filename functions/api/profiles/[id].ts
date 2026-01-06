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
