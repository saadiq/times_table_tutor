import { ATTEMPT_INSERT_SQL, attemptBindValues, isBindableAttempt, type AttemptPayload } from '../../_shared/attemptsSql'

interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { attempts } = await request.json<{ attempts: AttemptPayload[] }>()

  if (!attempts || !Array.isArray(attempts)) {
    return Response.json({ error: 'attempts array required' }, { status: 400 })
  }

  // Drop malformed entries rather than let one poison the atomic batch on
  // every retry; the client clears what this POST carried on a 200.
  const valid = attempts.filter(isBindableAttempt)
  if (valid.length === 0) {
    return Response.json({ synced: 0 })
  }

  const stmt = env.DB.prepare(ATTEMPT_INSERT_SQL)
  const batch = valid.map((a) => stmt.bind(...attemptBindValues(a)))

  await env.DB.batch(batch)

  return Response.json({ synced: valid.length })
}
