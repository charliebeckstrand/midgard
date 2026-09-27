import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { BIFROST_URL } from './env'

/**
 * Fetches a gateway path on the server, and forwards the session cookies of the request.
 *
 * @remarks
 * For Server Components and route handlers only, because `cookies()` reads the
 * incoming request. The session travels in the `cookie` header, so callers never
 * hold a token or name the gateway origin (CONVENTIONS.md §6.2).
 *
 * @param path - Gateway path, such as `/auth/session`. It follows the origin as is.
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

/** Options for {@link readGateway}. */
export type ReadGatewayOptions = {
	/** The failed statuses that are expected, and that do not go to the log, such as `401`. */
	quiet?: number[]
}

/**
 * Reads the JSON body of a gateway path on the server, or `undefined` when the
 * gateway refuses or does not answer.
 *
 * @remarks
 * It sends the request through {@link bifrost}. Each failure goes to the log,
 * except a status in `quiet`. The control-flow errors of Next, such as the
 * dynamic-usage signal of a prerender, propagate.
 *
 * @param path - Gateway path, such as `/auth/session`.
 * @param options - The failed statuses that do not go to the log.
 * @returns The parsed body, or `undefined` on a failure.
 */
export async function readGateway<T>(
	path: string,
	{ quiet = [] }: ReadGatewayOptions = {},
): Promise<T | undefined> {
	try {
		const res = await bifrost(path)

		if (res.ok) return (await res.json()) as T

		if (!quiet.includes(res.status)) console.error(`auth: GET ${path} failed (${res.status})`)
	} catch (error) {
		// A prerender reads `cookies()`, and Next throws to mark the route dynamic. Let it through.
		unstable_rethrow(error)

		console.error(`auth: GET ${path} threw`, error)
	}

	return undefined
}
