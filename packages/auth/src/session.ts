import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { bifrost, requireGateway, type Schema } from './fetch'
import { sessionCookie } from './session-cookie'

/**
 * A role of a user. `user` lets the account change data in the apps, and
 * `admin` lets it manage other users.
 */
export type Role = User['roles'][number]

/** Account record of a user, as the gateway returns it. */
export type User = Schema<'User'>

/**
 * Session of the signed-in user, as the gateway's `/auth/session` returns it.
 *
 * @remarks
 * The gateway reads `user` from the users table for each request. Thus a change
 * to the role or the status of the user shows at once.
 */
export type Session = Schema<'Session'>

/**
 * Returns the current {@link Session}, or `undefined` when no session exists.
 *
 * @remarks
 * For Server Components and route handlers. It reads the session through
 * {@link bifrost}. React `cache` wraps it, so repeat calls in one request hit the
 * gateway once. A request without the session cookie resolves to `undefined`,
 * and it does not go to the gateway, so a guest page costs no round trip. A
 * `401` resolves to `undefined`. Any other failure throws a `GatewayError`, so
 * an outage of the gateway does not look like a signed-out user. The
 * control-flow errors of Next, such as the dynamic-usage signal of a prerender,
 * propagate.
 */
export const getSession = cache(async (): Promise<Session | undefined> => {
	const cookieStore = await cookies()

	if (!cookieStore.has(sessionCookie)) return undefined

	return requireGateway('/auth/session', () => bifrost.GET('/auth/session'), { absent: [401] })
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

	if (!session.user.roles.includes('admin')) redirect('/account')

	if (!session.two_step) redirect('/verify')

	return session
}
