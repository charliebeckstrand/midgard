import { type NextRequest, NextResponse } from 'next/server'
import { BIFROST_URL } from './env'
import { isApiRoute, isGuestRoute } from './routes'

// Every matched request waits on the session check, guest routes included, so a
// hung gateway must not hang the app. A timeout fails closed, as an unauthenticated session.
const sessionTimeout = 5_000

/**
 * Resolves the session: calls the gateway's `/auth/session` with the cookies of the request.
 *
 * @internal
 * @returns `true` only when the gateway reports `authenticated: true`. A failed
 *   status, a thrown request, or a timeout resolves to `false`, and each failure
 *   except a `401` goes to the log.
 */
async function isAuthenticated(request: NextRequest): Promise<boolean> {
	try {
		const res = await fetch(`${BIFROST_URL}/auth/session`, {
			headers: { cookie: request.headers.get('cookie') ?? '' },
			signal: AbortSignal.timeout(sessionTimeout),
		})

		if (res.ok) {
			const { authenticated } = (await res.json()) as { authenticated?: boolean }

			return authenticated === true
		}

		if (res.status !== 401) console.error(`auth: GET /auth/session failed (${res.status})`)
	} catch (error) {
		console.error('auth: GET /auth/session threw', error)
	}

	return false
}

/**
 * Gates a request by session, and redirects between guest and protected routes.
 *
 * @remarks
 * Export it from the `proxy.ts` of an app. An authenticated user on a guest route
 * (`/login`, `/register`) goes to `/`. An unauthenticated user on any other route
 * goes to `/login`. All other requests continue.
 *
 * An unauthenticated request to an API route (`/api/*`) gets a `401` JSON response
 * in place of the redirect. A `fetch` follows a redirect, and the login page
 * answers `200`, so the caller reads a rejected write as a success.
 *
 * @param request - The incoming request. Its cookies resolve the session.
 * @returns A redirect, a `401` for an API route, or `NextResponse.next()`.
 */
export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	const guest = isGuestRoute(pathname)
	const authenticated = await isAuthenticated(request)

	if (guest && authenticated) {
		return NextResponse.redirect(new URL('/', request.url))
	}

	if (!guest && !authenticated) {
		if (isApiRoute(pathname)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		return NextResponse.redirect(new URL('/login', request.url))
	}

	return NextResponse.next()
}
