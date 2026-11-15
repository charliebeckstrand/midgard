import { type NextRequest, NextResponse } from 'next/server'
import { createSeed } from '@/utilities/seed'

/**
 * Starts a new run: sends `/` to the address of a new seed. The proxy sends a
 * `307` before a render. A page at `/` cannot do this in a production build,
 * because the build prerenders the shell of the layout, and the response
 * starts with a `200` before the page runs. The redirect then needs a script.
 */
export function proxy(request: NextRequest) {
	return NextResponse.redirect(new URL(`/${createSeed()}`, request.url))
}

export const config = {
	matcher: '/',
}
