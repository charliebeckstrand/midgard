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
 * Makes a typed client of the gateway on the server. It forwards the session cookies of the request.
 *
 * @remarks
 * For Server Components and route handlers only, because `cookies()` reads the
 * incoming request. The session travels in the `cookie` header, so callers never
 * hold a token or name the gateway origin (CONVENTIONS.md §6.2).
 *
 * A request has no `cache` option. With Cache Components, a fetch without a
 * `cache` option does not go into a cache, and it is dynamic. Do not give the
 * `Request` an `init` such as `{ cache: 'no-store' }`. Next merges that `init`
 * into the `Request`, and then it does not hold the fetch for the dynamic stage
 * of the render. The read then ends in the runtime stage, where the `Date.now()`
 * of the fetch is a prerender error.
 *
 * `P` is the paths type of a spec that the gateway serves. {@link bifrost} is
 * one. An app makes its own for a service that the gateway forwards to, such as
 * Mimir.
 *
 * A call such as `client.GET('/auth/session')` resolves to `{ data, error, response }`.
 * `data` is set when the status is OK, and `error` holds the body of any other status.
 */
export function createGatewayClient<P extends {}>() {
	return createClient<P>({
		baseUrl: BIFROST_URL,
		async fetch(request) {
			const cookieStore = await cookies()

			request.headers.set('cookie', cookieStore.toString())

			return fetch(request)
		},
	})
}

/** The typed client of the gateway on the server (see {@link createGatewayClient}). */
export const bifrost = createGatewayClient<Paths>()

/**
 * A gateway read that failed: a status the caller does not expect, or no answer.
 *
 * @remarks
 * {@link requireGateway} throws it. A page lets it reach the error page of the
 * app, and a route handler answers `503`.
 */
export class GatewayError extends Error {
	constructor(path: string, options?: ErrorOptions) {
		super(`auth: GET ${path} failed`, options)

		this.name = 'GatewayError'
	}
}

/** Options for {@link requireGateway}. */
type RequireGatewayOptions = {
	/** The failed statuses that mean that the data does not exist, such as `401` or `404`. */
	absent?: number[]
}

/**
 * Resolves to the `data` of one gateway read, or `undefined` for a status in
 * `absent`. Any other failure throws a {@link GatewayError}.
 *
 * @remarks
 * Use it where an empty answer would say something false, such as "no second
 * factor" or "no users". Use {@link readGateway} where a failure can fall back
 * to a default. The control-flow errors of Next, such as the dynamic-usage
 * signal of a prerender, propagate.
 *
 * @param path - The gateway path, for the error.
 * @param read - The read, such as `() => bifrost.GET('/auth/mfa')`.
 * @param options - The failed statuses that mean that the data does not exist.
 * @returns The `data` of an OK status, or `undefined` for a status in `absent`.
 */
export async function requireGateway<Data>(
	path: string,
	read: () => Promise<{ data?: Data; response: Response }>,
	{ absent = [] }: RequireGatewayOptions = {},
): Promise<Data | undefined> {
	let answer: { data?: Data; response: Response }

	try {
		answer = await read()
	} catch (error) {
		unstable_rethrow(error)

		throw new GatewayError(path, { cause: error })
	}

	if (answer.data) return answer.data

	if (absent.includes(answer.response.status)) return undefined

	throw new GatewayError(path, { cause: `status ${answer.response.status}` })
}

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
