import { type ParseResult, parsePlaceDraft } from '../schemas/place'
import type { PlaceDraft } from '../types'

/**
 * Reads a request body as JSON.
 *
 * Every handler that takes one goes through here, so a body no handler can read
 * is refused the same way and says the same thing wherever it arrives. The body
 * must be sent as `application/json`, which a plain form can't do, so a write
 * from another site always needs a CORS preflight that the app never answers.
 */
export async function readJson(request: Request): Promise<ParseResult<unknown>> {
	const type = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()

	if (type !== 'application/json') {
		return { ok: false, issues: ['Body must be sent as `application/json`.'] }
	}

	try {
		return { ok: true, value: await request.json() }
	} catch {
		return { ok: false, issues: ['Body is not valid JSON.'] }
	}
}

/**
 * Reads a request body as a place draft.
 *
 * Shared by the create and the replace, so both refuse the same shapes and say
 * the same things about them — a body a create rejected must not be writable
 * through an edit.
 */
export async function readDraft(request: Request): Promise<ParseResult<PlaceDraft>> {
	const body = await readJson(request)

	return body.ok ? parsePlaceDraft(body.value) : body
}
