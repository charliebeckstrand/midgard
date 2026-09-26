import { getSession, type Role } from 'auth'

/**
 * The id of the signed-in user, or the response that refuses the request.
 *
 * @remarks
 * The proxy only finds the session cookie. This function asks the gateway for
 * the session, so a cookie that is not valid gets a `401`. With `role`, a user
 * without that role gets a `403`. A route that changes data asks for `user`.
 */
export async function authorize(role?: Role): Promise<string | Response> {
	const session = await getSession()

	if (!session) return Response.json({ issues: ['Sign in again.'] }, { status: 401 })

	if (role && !session.user.roles.includes(role)) {
		return Response.json({ issues: ['Your account cannot change places.'] }, { status: 403 })
	}

	return session.user.id
}
