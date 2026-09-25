import { unstable_rethrow } from 'next/navigation'
import { cache } from 'react'
import { bifrost } from './fetch'

/** Authenticated user record, as the gateway's `/auth/user` returns it. */
export type User = {
	id: string
	email: string
	is_active: boolean
	is_verified: boolean
	created_at: string
	updated_at: string
}

/**
 * Returns the current authenticated {@link User}, or `undefined` when no session exists.
 *
 * @remarks
 * For Server Components and route handlers. It reads the session through
 * {@link bifrost}. React `cache` wraps it, so repeat calls in one request hit the
 * gateway once. A failed status or a thrown request resolves to `undefined`, and
 * each failure except a `401` goes to the log. The control-flow errors of Next,
 * such as the dynamic-usage signal of a prerender, propagate.
 */
export const getUser = cache(async (): Promise<User | undefined> => {
	try {
		const res = await bifrost('/auth/user')

		if (res.ok) return (await res.json()) as User

		if (res.status !== 401) console.error(`auth: GET /auth/user failed (${res.status})`)
	} catch (error) {
		// A prerender reads `cookies()`, and Next throws to mark the route dynamic. Let it through.
		unstable_rethrow(error)

		console.error('auth: GET /auth/user threw', error)
	}

	return undefined
})
