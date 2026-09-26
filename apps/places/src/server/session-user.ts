import { getSession } from 'auth'

/**
 * The id of the signed-in user, or `null` when the request has no valid session.
 *
 * The proxy only finds the session cookie. This function asks the gateway for
 * the session, so a cookie that is not valid gets no data.
 */
export async function sessionUserId(): Promise<string | null> {
	const session = await getSession()

	return session?.user.id ?? null
}

/** The answer to a request that has no valid session. */
export function unauthorized(): Response {
	return Response.json({ issues: ['Sign in again.'] }, { status: 401 })
}
