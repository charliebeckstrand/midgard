import { type NextRequest, NextResponse } from 'next/server'

const guestRoutes = ['/login']

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	const isGuestRoute = guestRoutes.some((r) => pathname.startsWith(r))

	if (!isGuestRoute) return NextResponse.next()

	// Only check session for guest routes (to redirect already-authenticated users)
	const sessionResponse = await fetch(new URL('/auth/session', request.nextUrl.origin), {
		headers: { cookie: request.headers.get('cookie') || '' },
	})

	let authenticated = false

	if (sessionResponse.ok) {
		const data = (await sessionResponse.json()) as { authenticated?: boolean }

		authenticated = data.authenticated === true
	}

	if (isGuestRoute && authenticated) {
		return NextResponse.redirect(new URL('/', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/login'],
}
