/** The API of civicAPI. It is free, needs no key, and asks for attribution. */
const CIVIC_API = 'https://civicapi.org/api/v2'

/** The client that the requests name, so the operator of civicAPI can tell who reads it. */
const USER_AGENT = 'midgard-elections (+https://github.com/charliebeckstrand/midgard)'

/** A read of civicAPI: the answer, or the message of a failure. A failure is no answer, or an answer that is not OK. */
export type CivicRead = { ok: true; raw: unknown } | { ok: false; message: string }

/**
 * Reads one race of civicAPI, `race/{id}`. The server of the app is the only
 * reader of civicAPI. A failure is a value, so that the cache of the race can
 * give it a short life (`src/server/races.ts`).
 */
export async function fetchRace(id: number): Promise<CivicRead> {
	const response = await fetch(`${CIVIC_API}/race/${id}`, {
		headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
	}).catch(() => null)

	if (response === null) return { ok: false, message: `civicAPI did not answer for race ${id}.` }

	if (!response.ok)
		return { ok: false, message: `civicAPI answered ${response.status} for race ${id}.` }

	return { ok: true, raw: await response.json() }
}
