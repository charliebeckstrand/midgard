import { type NextRequest, NextResponse } from 'next/server'
import { BIFROST_URL } from './env'
import { isApiRoute, isGuestRoute } from './routes'

/** Options controlling {@link proxy} redirects. */
export type ProxyOptions = {
	/**
	 * Where authenticated users are sent off a guest route.
	 *
	 * @defaultValue '/'
	 */
	homepage?: string
	/**
	 * Whether to redirect unauthenticated users away from non-guest routes to
	 * `/login`. An unauthenticated API request gets a `401` in place of the
	 * redirect.
	 *
	 * @defaultValue true
	 */
	protect?: boolean
}

/**
 * Resolves the session by calling the gateway's `/auth/session` with the request's cookies.
 *
 * @internal
 * @returns `true` only when the gateway reports `authenticated: true`; a non-OK
 *   status (logged unless `401`) or a thrown request yields `false`.
 */
async function isAuthenticated(request: NextRequest): Promise<boolean> {
	try {
		const res = await fetch(`${BIFROST_URL}/auth/session`, {
			headers: { cookie: request.headers.get('cookie') || '' },
		})

		if (!res.ok) {
			if (res.status !== 401) console.error(`auth: GET /auth/session failed (${res.status})`)

			return false
		}

		const data = (await res.json()) as { authenticated?: boolean }

		return data.authenticated === true
	} catch (error) {
		console.error('auth: GET /auth/session threw', error)

		return false
	}
}

/**
 * Gates a request by session, redirecting between guest and protected routes.
 *
 * @remarks
 * Drive it from a Next middleware/proxy entry. Authenticated users on a guest
 * route ({@link isGuestRoute}) are sent to `homepage`; unauthenticated users on
 * a protected route are sent to `/login` when `protect` is set. All other
 * requests pass through.
 *
 * An unauthenticated request to an API route ({@link isApiRoute}) gets a `401`
 * JSON response, not the redirect. A `fetch` follows a redirect, and the login
 * page answers `200`, so the caller would read a rejected write as a success.
 *
 * @param request - The incoming request; its cookies resolve the session.
 * @param options - See {@link ProxyOptions}.
 * @returns A redirect `NextResponse`, a `401` `NextResponse` for an API route,
 *   or `NextResponse.next()` to continue.
 */
export async function proxy(request: NextRequest, options: ProxyOptions = {}) {
	const { homepage = '/', protect = true } = options

	const { pathname } = request.nextUrl

	const authenticated = await isAuthenticated(request)
	const guest = isGuestRoute(pathname)

	if (guest && authenticated) {
		return NextResponse.redirect(new URL(homepage, request.url))
	}

	if (protect && !guest && !authenticated) {
		if (isApiRoute(pathname)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		return NextResponse.redirect(new URL('/login', request.url))
	}

	return NextResponse.next()
}
