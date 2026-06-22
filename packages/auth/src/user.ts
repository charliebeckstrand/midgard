import { cache } from 'react'
import { bifrost } from './fetch'

/** Authenticated user record as returned by the gateway's `/auth/user`. */
export type User = {
	id: string
	email: string
	is_active: boolean
	is_verified: boolean
	created_at: string
	updated_at: string
}

/**
 * Returns the current authenticated {@link User}, or `undefined` when unauthenticated.
 *
 * @remarks
 * Server-side accessor for Server Components and route handlers; reads the
 * session via {@link bifrost}. Wrapped in React `cache`, so repeat calls within
 * one request hit the gateway once. A `401`, a non-OK status, or a thrown
 * request all resolve to `undefined` (the latter two are logged).
 *
 * @returns The user, or `undefined` if not signed in or the request failed.
 */
export const getUser = cache(async (): Promise<User | undefined> => {
	try {
		const res = await bifrost('/auth/user')

		if (res.status === 401) return undefined

		if (!res.ok) {
			console.error(`auth: GET /auth/user failed (${res.status})`)

			return undefined
		}

		return (await res.json()) as User
	} catch (error) {
		console.error('auth: GET /auth/user threw', error)

		return undefined
	}
})
