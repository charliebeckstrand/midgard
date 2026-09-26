import { type NextRequest, NextResponse } from 'next/server'
import { BIFROST_URL, PROXY_SECRET } from './env'
import { isApiRoute, isAuthRoute, isGuestRoute } from './routes'

// Every matched request waits on the session check, guest routes included, so a
// hung gateway must not hang the app. A timeout fails closed, as an unauthenticated session.
const sessionTimeout = 5_000

/**
 * Resolves the session: calls the gateway's `/auth/session` with the cookies of the request.
 *
 * @internal
 * @returns `true` only when the gateway answers `200`. The gateway answers `401`
 *   when no live session exists. A failed status, a thrown request, or a timeout
 *   resolves to `false`, and each failure except a `401` goes to the log.
 */
async function isAuthenticated(request: NextRequest): Promise<boolean> {
	try {
		const res = await fetch(`${BIFROST_URL}/auth/session`, {
			headers: { cookie: request.headers.get('cookie') ?? '' },
			signal: AbortSignal.timeout(sessionTimeout),
		})

		if (res.ok) return true

		if (res.status !== 401) console.error(`auth: GET /auth/session failed (${res.status})`)
	} catch (error) {
		console.error('auth: GET /auth/session threw', error)
	}

	return false
}

/**
 * Continues a request to the gateway, and adds the address of the browser.
 *
 * @remarks
 * App Platform writes the address of the client into `do-connecting-ip`, and it
 * writes it again on each hop. When the rewrite sends the request to the
 * gateway, that header holds the address of the app. Thus the proxy copies the
 * address into `x-client-ip`, with the secret in `x-proxy-secret`, and the gateway
 * rate-limits by browser. The proxy always removes the values that the client
 * sent in these headers.
 *
 * @internal
 */
function forwardToGateway(request: NextRequest): NextResponse {
	const headers = new Headers(request.headers)

	headers.delete('x-client-ip')
	headers.delete('x-proxy-secret')

	const ip = request.headers.get('do-connecting-ip')

	if (PROXY_SECRET && ip) {
		headers.set('x-client-ip', ip)
		headers.set('x-proxy-secret', PROXY_SECRET)
	}

	return NextResponse.next({ request: { headers } })
}

/**
 * Gates a request by session, and redirects between guest and protected routes.
 *
 * @remarks
 * Export it from the `proxy.ts` of an app. An auth route (`/auth/*`) continues
 * without a session check, because sign-in and register run before a session
 * exists. An authenticated user on a guest route (`/login`, `/register`) goes to
 * `/`. An unauthenticated user on any other route goes to `/login`. All other
 * requests continue.
 *
 * An unauthenticated request to an API route (`/api/*`) gets a `401` JSON response
 * in place of the redirect. A `fetch` follows a redirect, and the login page
 * answers `200`, so the caller reads a rejected write as a success.
 *
 * An auth or API request that continues gets the address of the browser for
 * the gateway (see {@link forwardToGateway}).
 *
 * @param request - The incoming request. Its cookies resolve the session.
 * @returns A redirect, a `401` for an API route, or `NextResponse.next()`.
 */
export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (isAuthRoute(pathname)) return forwardToGateway(request)

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

	if (isApiRoute(pathname)) return forwardToGateway(request)

	return NextResponse.next()
}
