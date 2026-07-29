import { normalizeCurriculum } from '../../../_shared/curriculum';

interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const profileId = params.id as string;
  const { curriculum, sessionsCompleted } = await request.json<{
    curriculum?: string;
    sessionsCompleted: number;
  }>();

  if (typeof sessionsCompleted !== 'number' || !Number.isFinite(sessionsCompleted) || sessionsCompleted < 0) {
    return Response.json(
      { error: 'sessionsCompleted must be a non-negative number' },
      { status: 400 }
    );
  }

  // Counts are per curriculum: the scene warmth they drive is.
  const curriculumId = normalizeCurriculum(curriculum);

  // MAX keeps the counter monotone: two devices pushing independently can only
  // ever raise the stored count, never roll it back to a stale device's value.
  await env.DB.prepare(
    `INSERT INTO profile_sessions (profile_id, curriculum, sessions_completed)
     VALUES (?, ?, ?)
     ON CONFLICT(profile_id, curriculum) DO UPDATE SET
       sessions_completed = MAX(profile_sessions.sessions_completed, excluded.sessions_completed)`
  ).bind(profileId, curriculumId, Math.floor(sessionsCompleted)).run();

  return new Response(null, { status: 204 });
};
