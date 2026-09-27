import { cookies } from 'next/headers'
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
