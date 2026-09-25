import { cookies } from 'next/headers'
import { BIFROST_URL } from './env'

/**
 * Fetches a gateway path on the server, and forwards the session cookies of the request.
 *
 * @remarks
 * For Server Components and route handlers only, because `cookies()` reads the
 * incoming request. The session travels in the `cookie` header, so callers never
 * hold a token or name the gateway origin (CONVENTIONS.md §6.2).
 *
 * @param path - Gateway path, such as `/auth/user`. It follows the origin as is.
 * @param init - Request options. `cache` defaults to `'no-store'`, and `init` can
 *   override it. The forwarded cookie replaces a `cookie` in `headers`.
 * @returns The raw gateway {@link Response}. The caller checks `ok` and `status`.
 */
export async function bifrost(path: string, init: RequestInit = {}): Promise<Response> {
	const cookieStore = await cookies()

	const headers = new Headers(init.headers)
	headers.set('cookie', cookieStore.toString())

	return fetch(`${BIFROST_URL}${path}`, { cache: 'no-store', ...init, headers })
}
