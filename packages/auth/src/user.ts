import { unstable_rethrow } from 'next/navigation'
import { cache } from 'react'
import { bifrost } from './fetch'

/** Role of an account. An `admin` can deactivate and reactivate the accounts of the `user` role. */
export type UserRole = 'user' | 'admin'

/** Authenticated user record, as the gateway returns it. */
export type User = {
	id: string
	email: string
	is_active: boolean
	is_verified: boolean
	role: UserRole
	created_at: string
	updated_at: string
}

/** Live session, as the gateway's `/auth/session` returns it. */
export type Session = {
	/** SHA-256 of the session token, in hex. The token itself stays in the cookie. */
	id: string
	created_at: string
	expires_at: string
	user: User
}

/**
 * Returns the current authenticated {@link User}, or `undefined` when no session exists.
 *
 * @remarks
 * For Server Components and route handlers. It reads the session from the
 * gateway's `/auth/session` through {@link bifrost}, and returns its user. React `cache` wraps it, so repeat calls in one request hit the
 * gateway once. A failed status or a thrown request resolves to `undefined`, and
 * each failure except a `401` goes to the log. The control-flow errors of Next,
 * such as the dynamic-usage signal of a prerender, propagate.
 */
export const getUser = cache(async (): Promise<User | undefined> => {
	try {
		const res = await bifrost('/auth/session')

		if (res.ok) return ((await res.json()) as Session).user

		if (res.status !== 401) console.error(`auth: GET /auth/session failed (${res.status})`)
	} catch (error) {
		// A prerender reads `cookies()`, and Next throws to mark the route dynamic. Let it through.
		unstable_rethrow(error)

		console.error('auth: GET /auth/session threw', error)
	}

	return undefined
})
