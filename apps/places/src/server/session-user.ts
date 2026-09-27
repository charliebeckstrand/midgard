import { GatewayError, getSession, type Role, type Session } from 'auth'

/**
 * The id of the signed-in user, or the response that refuses the request.
 *
 * @remarks
 * The proxy only finds the session cookie. This function asks the gateway for
 * the session, so a cookie that is not valid gets a `401`. When the gateway
 * fails, the request gets a `503` and not a `401`, so the page does not send
 * the user to `/login`. With `role`, a user
 * without that role, or whose email is not verified, gets a `403`. A route that
 * changes data asks for `user`, so an account made in seconds with an address
 * nobody checked can't fill the database.
 */
export async function authorize(role?: Role): Promise<string | Response> {
	let session: Session | undefined

	try {
		session = await getSession()
	} catch (error) {
		if (!(error instanceof GatewayError)) throw error

		console.error(error)

		return issue(503, 'Sign-in is not available now. Try again soon.')
	}

	if (!session) return issue(401, 'Sign in again.')

	if (role && !session.user.roles.includes(role)) {
		return issue(403, 'Your account cannot change places.')
	}

	if (role && !session.user.is_verified) {
		return issue(403, 'Verify your email to change places.')
	}

	return session.user.id
}

/**
 * Wraps a route handler so that it runs only for a signed-in user.
 *
 * @remarks
 * The wrapper calls {@link authorize} with `role`. When `authorize` refuses the
 * request, the wrapper returns that response and does not call `handler`.
 * Otherwise it calls `handler` with the user id before the route arguments.
 */
export function withUser<Args extends unknown[]>(
	role: Role | undefined,
	handler: (userId: string, ...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
	return async (...args) => {
		const userId = await authorize(role)

		return userId instanceof Response ? userId : handler(userId, ...args)
	}
}

/** A response with `status` whose body holds the messages that tell the user why. */
export function issue(status: number, ...issues: string[]): Response {
	return Response.json({ issues }, { status })
}

/** Headers of a response that holds one user's data, so no cache serves it to another. */
export const userOnly = { 'cache-control': 'private, no-store' }
