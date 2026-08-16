import type { ParseResult } from '../schemas/recipe'

/**
 * Reads a request body as JSON.
 *
 * Every handler that takes one goes through here, so a body no handler can read
 * is refused the same way and says the same thing wherever it arrives.
 */
export async function readJson(request: Request): Promise<ParseResult<unknown>> {
	try {
		return { ok: true, value: await request.json() }
	} catch {
		return { ok: false, issues: ['Body is not valid JSON.'] }
	}
}

/**
 * Reads a body through a parser, in the one shape every handler wants.
 *
 * The parse and the JSON read fail the same way, so a handler answers a bad body
 * and a bad shape with one branch rather than two.
 */
export async function readAs<T>(
	request: Request,
	parse: (input: unknown) => ParseResult<T>,
): Promise<ParseResult<T>> {
	const body = await readJson(request)

	return body.ok ? parse(body.value) : body
}

/** The one shape a refusal takes, so every route says it the same way. */
export function refuse(issues: string[], status = 400): Response {
	return Response.json({ issues }, { status })
}
