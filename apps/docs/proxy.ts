import { proxy as heimdallProxy } from 'heimdall/proxy'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
	return heimdallProxy(request, { protect: false })
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/).*)'],
}
