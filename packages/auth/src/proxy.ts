import { type NextRequest, NextResponse } from 'next/server'
import { BIFROST_URL } from './env'
import { isGuestRoute } from './routes'

export type ProxyOptions = {
	homepage?: string
	protect?: boolean
}

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

export async function proxy(request: NextRequest, options: ProxyOptions = {}) {
	const { homepage = '/', protect = true } = options

	const { pathname } = request.nextUrl

	const authenticated = await isAuthenticated(request)
	const guest = isGuestRoute(pathname)

	if (guest && authenticated) {
		return NextResponse.redirect(new URL(homepage, request.url))
	}

	if (protect && !guest && !authenticated) {
		return NextResponse.redirect(new URL('/login', request.url))
	}

	return NextResponse.next()
}
