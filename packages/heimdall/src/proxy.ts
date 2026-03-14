import { type NextRequest, NextResponse } from 'next/server'

const guestRoutes = ['/login', '/register']

interface ProxyOptions {
	homepage?: string
}

export async function proxy(request: NextRequest, options: ProxyOptions = {}) {
	const { homepage = '/' } = options
	const { pathname } = request.nextUrl

	const sessionResponse = await fetch(new URL('/auth/session', request.nextUrl.origin), {
		headers: { cookie: request.headers.get('cookie') || '' },
	})

	let authenticated = false

	if (sessionResponse.ok) {
		const data = (await sessionResponse.json()) as { authenticated?: boolean }

		authenticated = data.authenticated === true
	}

	const isGuestRoute = guestRoutes.some((r) => pathname.startsWith(r))

	if (isGuestRoute && authenticated) {
		return NextResponse.redirect(new URL(homepage, request.url))
	}

	if (!isGuestRoute && !authenticated) {
		return NextResponse.redirect(new URL('/login', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/', '/login', '/register'],
}
