import * as heimdall from 'heimdall/proxy'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
	return heimdall.proxy(request, { protect: false })
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/).*)'],
}
