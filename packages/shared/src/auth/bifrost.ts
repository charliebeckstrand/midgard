import type { Paths } from 'auth'
import createClient, { type Client } from 'openapi-fetch'
import { fetchWithSecondStep } from './second-step-request'

/**
 * The typed client of the gateway in the browser.
 *
 * @remarks
 * Each request goes to a same-origin `/auth/*` or `/api/*` path, which the
 * rewrites send to the gateway (CONVENTIONS.md §6.3). When the gateway asks for
 * the second step, the dialog of the app asks the user for it, and the request
 * goes again (see {@link fetchWithSecondStep}).
 *
 * A call such as `bifrost.GET('/auth/passkeys')` resolves to `{ data, error, response }`.
 * `data` is set when the status is OK, and `error` holds the body of any other status.
 */
export const bifrost: Client<Paths> = createClient<Paths>({ fetch: fetchWithSecondStep })

/**
 * Resolves to the `data` of an OK result, and throws for any other status.
 *
 * @remarks
 * A query or a mutation reads a thrown error as a failure. The error holds the
 * message of the gateway, such as "Sign in again to change how you sign in", so
 * that the page can show it.
 */
export async function unwrap<Data>(
	result: Promise<{ data?: Data; error?: { message?: string } | string; response: Response }>,
): Promise<Data> {
	const { data, error, response } = await result

	if (!response.ok) {
		const message = typeof error === 'object' ? error.message : undefined

		throw new Error(message ?? `${response.url} failed: ${response.status}`)
	}

	// An OK status without a body, such as a `204`, has no `data`.
	return data as Data
}
