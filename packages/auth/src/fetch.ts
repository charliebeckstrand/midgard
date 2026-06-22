import { cookies } from 'next/headers'
import { BIFROST_URL } from './env'

/**
 * Fetches a gateway path server-side, forwarding the request's session cookies.
 *
 * @remarks
 * For Server Components and route handlers only — `cookies()` reads the incoming
 * request. The bearer session travels as the `cookie` header; callers never
 * handle tokens or the gateway origin directly (CONVENTIONS.md §6.2).
 *
 * @param path - Gateway path, appended to {@link BIFROST_URL} (e.g. `/auth/user`).
 * @param init - Request options. `cache: 'no-store'` is the default but is
 *   overridable; `headers` always carry the forwarded cookie.
 * @returns The raw gateway {@link Response}; the caller checks `ok`/`status`.
 */
export async function bifrost(path: string, init: RequestInit = {}): Promise<Response> {
	const cookieStore = await cookies()

	const headers = new Headers(init.headers)
	headers.set('cookie', cookieStore.toString())

	return fetch(`${BIFROST_URL}${path}`, { cache: 'no-store', ...init, headers })
}
