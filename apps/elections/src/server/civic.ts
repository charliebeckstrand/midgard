/** The API of civicAPI. It is free, needs no key, and asks for attribution. */
const CIVIC_API = 'https://civicapi.org/api/v2'

/** The client that the requests name, so the operator of civicAPI can tell who reads it. */
const USER_AGENT = 'midgard-elections (+https://github.com/charliebeckstrand/midgard)'

/**
 * The time that a read of civicAPI can take, with its body. A prerender gives a
 * cache fill 54 s (90% of the 60 s `staticPageGenerationTimeout`), so a late
 * answer must fail before that limit, or the build fails.
 */
const CIVIC_TIMEOUT = 15_000

/** A read of civicAPI: the answer, or the message of a failure. A failure is no answer, a late answer, an answer that is not OK, or a body that breaks off. */
export type CivicRead = { ok: true; raw: unknown } | { ok: false; message: string }

/**
 * Reads one race of civicAPI, `race/{id}`. The server of the app is the only
 * reader of civicAPI. A failure is a value, so that the cache of the race can
 * give it a short life (`src/server/races.ts`).
 */
export async function fetchRace(id: number): Promise<CivicRead> {
	let response: Response

	// The signal also stops the read of the body.
	try {
		response = await fetch(`${CIVIC_API}/race/${id}`, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
			signal: AbortSignal.timeout(CIVIC_TIMEOUT),
		})
	} catch (error) {
		return { ok: false, message: `civicAPI did not answer for race ${id} (${readCause(error)}).` }
	}

	if (!response.ok)
		return { ok: false, message: `civicAPI answered ${response.status} for race ${id}.` }

	let body: string

	// A body that breaks off is no answer. A whole body that is not JSON throws.
	try {
		body = await response.text()
	} catch (error) {
		return {
			ok: false,
			message: `civicAPI broke off the answer for race ${id} (${readCause(error)}).`,
		}
	}

	return { ok: true, raw: JSON.parse(body) }
}

/**
 * Gives the cause of a failed read as text. A network failure of `fetch` is a
 * `TypeError` "fetch failed" that holds the real cause, such as `ECONNREFUSED`.
 */
function readCause(error: unknown): string {
	return String(error instanceof Error && error.cause !== undefined ? error.cause : error)
}
