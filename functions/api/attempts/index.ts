import { ATTEMPT_SELECT_COLUMNS, attemptRowToRecord, type AttemptRow } from '../../_shared/attemptsSql'

interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const profileId = url.searchParams.get('profileId')
  const since = url.searchParams.get('since')

  if (!profileId) {
    return Response.json({ error: 'profileId required' }, { status: 400 })
  }

  let query = `
    SELECT ${ATTEMPT_SELECT_COLUMNS}
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

  return Response.json({ attempts: results.map(attemptRowToRecord) })
}
