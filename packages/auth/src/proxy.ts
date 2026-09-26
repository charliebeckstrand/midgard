import { type NextRequest, NextResponse } from 'next/server'
import { PROXY_SECRET } from './env'
import { isApiRoute, isAuthRoute, isGuestRoute } from './routes'

// The gateway sets the session with the `__Host-` prefix. The browser then sends
// it only over HTTPS, and a sibling subdomain cannot set it.
const sessionCookie = '__Host-session'

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
 * the gateway (see {@link forwardToGateway}).
 *
 * @param request - The incoming request.
 * @returns A redirect, a `401` for an API route, or `NextResponse.next()`.
 */
export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (isAuthRoute(pathname)) return forwardToGateway(request)

	if (isGuestRoute(pathname)) return NextResponse.next()

	if (!request.cookies.has(sessionCookie)) {
		if (isApiRoute(pathname)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		return NextResponse.redirect(new URL('/login', request.url))
	}

	if (isApiRoute(pathname)) return forwardToGateway(request)

	return NextResponse.next()
}
