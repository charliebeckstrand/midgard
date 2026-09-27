import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import createClient from 'openapi-fetch'
import { BIFROST_URL } from './env'
import type { components, paths } from './openapi'

/**
 * The routes of the gateway, with their parameters, bodies, and responses.
 *
 * @remarks
 * `openapi.d.ts` holds the types, and `pnpm --filter auth openapi` generates
 * them from the spec that the gateway commits.
 */
export type Paths = paths

/** A named schema of the gateway, such as `Schema<'Passkey'>`. */
export type Schema<Name extends keyof components['schemas']> = components['schemas'][Name]

/**
 * The typed client of the gateway on the server. It forwards the session cookies of the request.
 *
 * @remarks
 * For Server Components and route handlers only, because `cookies()` reads the
 * incoming request. The session travels in the `cookie` header, so callers never
 * hold a token or name the gateway origin (CONVENTIONS.md §6.2). Each request
 * uses `cache: 'no-store'`.
 *
 * A call such as `bifrost.GET('/auth/session')` resolves to `{ data, error, response }`.
 * `data` is set when the status is OK, and `error` holds the body of any other status.
 */
export const bifrost = createClient<Paths>({
	baseUrl: BIFROST_URL,
	async fetch(request) {
		const cookieStore = await cookies()

		request.headers.set('cookie', cookieStore.toString())

		return fetch(request, { cache: 'no-store' })
	},
})

/** Options for {@link readGateway}. */
type ReadGatewayOptions = {
	/** The failed statuses that are expected, and that do not go to the log, such as `401`. */
	quiet?: number[]
}

/**
 * Resolves to the `data` of one gateway read, or `undefined` when the gateway
 * refuses or does not answer.
 *
 * @internal
 * @remarks
 * Each failure goes to the log, except a status in `quiet`. The control-flow
 * errors of Next, such as the dynamic-usage signal of a prerender, propagate.
 *
 * @param path - The gateway path, for the log.
 * @param read - The read, such as `() => bifrost.GET('/auth/session')`.
 * @param options - The failed statuses that do not go to the log.
 * @returns The `data` of an OK status, or `undefined` on a failure.
 */
export async function readGateway<Data>(
	path: string,
	read: () => Promise<{ data?: Data; response: Response }>,
	{ quiet = [] }: ReadGatewayOptions = {},
): Promise<Data | undefined> {
	try {
		const { data, response } = await read()

		if (data) return data

		if (!quiet.includes(response.status)) {
			console.error(`auth: GET ${path} failed (${response.status})`)
		}
	} catch (error) {
		// A prerender reads `cookies()`, and Next throws to mark the route dynamic. Let it through.
		unstable_rethrow(error)

		console.error(`auth: GET ${path} threw`, error)
	}

	return undefined
}
