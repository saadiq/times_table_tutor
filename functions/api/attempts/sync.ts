interface Env {
  DB: D1Database
}

interface AttemptPayload {
  id: string
  factKey: string
  timestamp: string
  correct: boolean
  responseTimeMs: number
  inputMethod: string
  hintShown: boolean
  profileId: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { attempts } = await request.json<{ attempts: AttemptPayload[] }>()

  if (!attempts || !Array.isArray(attempts)) {
    return Response.json({ error: 'attempts array required' }, { status: 400 })
  }

  if (attempts.length === 0) {
    return Response.json({ synced: 0 })
  }

  const stmt = env.DB.prepare(`
    INSERT OR IGNORE INTO attempts
      (id, profile_id, fact_key, timestamp, correct, response_time_ms, input_method, hint_shown)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const batch = attempts.map((a) =>
    stmt.bind(
      a.id,
      a.profileId,
      a.factKey,
      new Date(a.timestamp).getTime(),
      a.correct ? 1 : 0,
      a.responseTimeMs,
      a.inputMethod,
      a.hintShown ? 1 : 0
    )
  )

  await env.DB.batch(batch)

  return Response.json({ synced: attempts.length })
}
