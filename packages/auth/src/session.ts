import { redirect, unstable_rethrow } from 'next/navigation'
import { cache } from 'react'
import { bifrost } from './fetch'

/** Account record of a user, as the gateway returns it. */
export type User = {
	id: string
	email: string
	is_active: boolean
	is_verified: boolean
	role: 'user' | 'admin'
	created_at: string
	updated_at: string
}

/**
 * Session of the signed-in user, as the gateway's `/auth/session` returns it.
 *
 * @remarks
 * The gateway reads `user` from the users table for each request. Thus a change
 * to the role or the status of the user shows at once.
 */
export type Session = {
	id: string
	created_at: string
	expires_at: string
	/**
	 * Whether the session passed a second step. A passkey sign-in passes it at
	 * once. A password or a GitHub or Google sign-in passes it at `/verify`.
	 */
	two_step: boolean
	user: User
}

/**
 * Returns the current {@link Session}, or `undefined` when no session exists.
 *
 * @remarks
 * For Server Components and route handlers. It reads the session through
 * {@link bifrost}. React `cache` wraps it, so repeat calls in one request hit the
 * gateway once. A failed status or a thrown request resolves to `undefined`, and
 * each failure except a `401` goes to the log. The control-flow errors of Next,
 * such as the dynamic-usage signal of a prerender, propagate.
 */
export const getSession = cache(async (): Promise<Session | undefined> => {
	try {
		const res = await bifrost('/auth/session')

		if (res.ok) return (await res.json()) as Session

		if (res.status !== 401) console.error(`auth: GET /auth/session failed (${res.status})`)
	} catch (error) {
		// A prerender reads `cookies()`, and Next throws to mark the route dynamic. Let it through.
		unstable_rethrow(error)

		console.error('auth: GET /auth/session threw', error)
	}

	return undefined
})

/**
 * Returns the current {@link Session}, or redirects to `/login`.
 *
 * @remarks
 * Call it from the layout of a segment that each signed-in user can open. The
 * proxy only finds the cookie, so this call is the check of the session itself.
 */
export async function requireSession(): Promise<Session> {
	const session = await getSession()

	if (!session) redirect('/login')

	return session
}

/**
 * Returns the session of an admin that passed the second step, or redirects.
 *
 * @remarks
 * Call it from the layout of a segment that only admins can open. The proxy
 * only finds the cookie, so this call is the check of the session itself.
 * Without a session, the redirect goes to `/login`. A signed-in user that is
 * not an admin goes to `/account`, where the user manages the passkeys. An
 * admin session without the second step goes to `/verify`. Thus the admin
 * gives the second step one time, after the sign-in.
 */
export async function requireAdmin(): Promise<Session> {
	const session = await requireSession()

	if (session.user.role !== 'admin') redirect('/account')

	if (!session.two_step) redirect('/verify')

	return session
}
