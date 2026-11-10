/** The API of civicAPI. It is free, needs no key, and asks for attribution. */
const CIVIC_API = 'https://civicapi.org/api/v2'

/** The client that the requests name, so the operator of civicAPI can tell who reads it. */
const USER_AGENT = 'midgard-elections (+https://github.com/charliebeckstrand/midgard)'

/**
 * Reads one race of civicAPI, `race/{id}`. The server of the app is the only
 * reader of civicAPI. An answer that is not OK throws, and the error boundary
 * of the page shows it.
 */
export async function fetchRace(id: number): Promise<unknown> {
	const response = await fetch(`${CIVIC_API}/race/${id}`, {
		headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
	})

	if (!response.ok) throw new Error(`civicAPI answered ${response.status} for race ${id}.`)

	return response.json()
}
