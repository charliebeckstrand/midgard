import createClient, { type Client } from 'openapi-fetch'
import { unwrap } from '../auth/bifrost'
import type { paths } from './openapi'

/**
 * A typed client of Mimir in the browser.
 *
 * @remarks
 * Each request goes to a same-origin `/api/*` path, which the gateway sends to
 * Mimir (CONVENTIONS.md §6.3). Give `Paths` only when the app serves a path
 * itself with a different body. The `fetch` is a function and not `fetch`
 * itself, because `openapi-fetch` keeps the `fetch` it gets, and a test stubs
 * the global.
 */
export function createMimirClient<Paths extends {} = paths>(): Client<Paths> {
	return createClient<Paths>({ fetch: (request) => fetch(request) })
}

/**
 * Resolves to the `data` of an OK result, and throws for any other status (see
 * {@link unwrap}). A `401` means that the session ended, so the page also goes
 * to `/login`.
 */
export async function settle<Data>(
	result: Promise<{ data?: Data; error?: { message?: string } | string; response: Response }>,
): Promise<Data> {
	const settled = await result

	if (settled.response.status === 401) window.location.assign('/login')

	return unwrap(Promise.resolve(settled))
}
