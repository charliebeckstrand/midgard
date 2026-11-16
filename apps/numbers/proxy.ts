import { forwardClientIp } from 'auth/proxy'
import { type NextRequest, NextResponse } from 'next/server'
import { createSeed } from '@/utilities/seed'

/**
 * Starts a new run, and sends the address of the browser to the gateway.
 *
 * `/` goes to the address of a new seed. The proxy sends a `307` before a
 * render. A page at `/` cannot do this in a production build, because the build
 * prerenders the shell of the layout, and the response starts with a `200`
 * before the page runs. The redirect then needs a script.
 *
 * Sign-in is optional, so no route needs a session. An auth or API request gets
 * the address of the browser (`forwardClientIp`).
 */
export function proxy(request: NextRequest) {
	if (request.nextUrl.pathname === '/') {
		return NextResponse.redirect(new URL(`/${createSeed()}`, request.url))
	}

	return forwardClientIp(request)
}

export const config = {
	matcher: ['/', '/auth/:path*', '/api/:path*'],
}
