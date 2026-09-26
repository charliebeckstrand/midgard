import { type NextRequest, NextResponse } from 'next/server'
import { clientIpSecret } from './env'
import { isApiRoute, isAuthRoute, isGuestRoute } from './routes'

// The gateway sets the session with the `__Host-` prefix. The browser then sends
// it only over HTTPS, and a sibling subdomain cannot set it.
const sessionCookie = '__Host-session'

// Read when the proxy loads, so the first request after a start fails when the secret is lost.
const secret = clientIpSecret()

/**
 * Continues a request, and adds the address of the browser to an auth or API request.
 *
 * @remarks
 * App Platform writes the address of the client into `do-connecting-ip`, and it
 * writes it again on each hop. When the rewrite sends the request to the
 * gateway, that header holds the address of the app. Thus the proxy copies the
 * address into `x-client-ip`, with the secret in `x-client-ip-secret`, and the
 * gateway rate-limits by browser. The proxy always removes the values that the
 * client sent in these headers. Other requests continue unchanged.
 *
 * Export it as `proxy` from the `proxy.ts` of an app with no session gate.
 *
 * @param request - The incoming request.
 * @returns `NextResponse.next()`, with the address for an auth or API request.
 */
export function forwardClientIp(request: NextRequest): NextResponse {
	const { pathname } = request.nextUrl

	if (!isAuthRoute(pathname) && !isApiRoute(pathname)) return NextResponse.next()

	const headers = new Headers(request.headers)

	headers.delete('x-client-ip')
	headers.delete('x-client-ip-secret')

	const ip = request.headers.get('do-connecting-ip')

	if (secret && ip) {
		headers.set('x-client-ip', ip)
		headers.set('x-client-ip-secret', secret)
	}

	return NextResponse.next({ request: { headers } })
}

/**
 * Gates a request by the session cookie.
 *
 * @remarks
 * Export it from the `proxy.ts` of an app. The proxy only finds the cookie, and
 * sends no request to the gateway. The gateway checks the session on each
 * `/api/*` request, and `requireAdmin` checks it for each protected page. So a
 * cookie that is not valid gets no data.
 *
 * An auth route (`/auth/*`) and a guest route (`/login`, `/register`) continue
 * without the cookie, because sign-in and register run before a session exists.
 * A request to any other route without the cookie goes to `/login`.
 *
 * An API route (`/api/*`) without the cookie gets a `401` JSON response in
 * place of the redirect. A `fetch` follows a redirect, and the login page
 * answers `200`, so the caller reads a rejected write as a success.
 *
 * An auth or API request that continues gets the address of the browser for
 * the gateway (see {@link forwardClientIp}).
 *
 * @param request - The incoming request.
 * @returns A redirect, a `401` for an API route, or `NextResponse.next()`.
 */
export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (isAuthRoute(pathname)) return forwardClientIp(request)

	if (isGuestRoute(pathname)) return NextResponse.next()

	if (!request.cookies.has(sessionCookie)) {
		if (isApiRoute(pathname)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		return NextResponse.redirect(new URL('/login', request.url))
	}

	return forwardClientIp(request)
}
