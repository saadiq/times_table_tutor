interface Env {
  DB: D1Database
}

interface AttemptRow {
  id: string
  profile_id: string
  fact_key: string
  timestamp: number
  correct: number
  response_time_ms: number | null
  input_method: string | null
  hint_shown: number
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const profileId = url.searchParams.get('profileId')
  const since = url.searchParams.get('since')

  if (!profileId) {
    return Response.json({ error: 'profileId required' }, { status: 400 })
  }

  let query = `
    SELECT id, profile_id, fact_key, timestamp, correct,
           response_time_ms, input_method, hint_shown
    FROM attempts
    WHERE profile_id = ?
  `
  const params: (string | number)[] = [profileId]

  if (since) {
    query += ' AND timestamp > ?'
    params.push(parseInt(since))
  }

  query += ' ORDER BY timestamp DESC LIMIT 1000'

  const { results } = await env.DB.prepare(query).bind(...params).all<AttemptRow>()

  const attempts = results.map((row) => ({
    id: row.id,
    factKey: row.fact_key,
    timestamp: new Date(row.timestamp).toISOString(),
    correct: row.correct === 1,
    responseTimeMs: row.response_time_ms,
    inputMethod: row.input_method,
    hintShown: row.hint_shown === 1,
    profileId: row.profile_id,
  }))

  return Response.json({ attempts })
}
