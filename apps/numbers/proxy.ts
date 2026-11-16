import { type NextRequest, NextResponse } from 'next/server'
import { CPU_SEGMENT, createSeed, runPath } from '@/utilities/seed'

/**
 * Starts a new run: sends `/` to the address of a new seed, and `/cpu` to the
 * address of a new seed against the CPU, such as `/cpu/k3x9q2`. The proxy sends a
 * `307` before a render. A page at `/` cannot do this in a production build,
 * because the build prerenders the shell of the layout, and the response
 * starts with a `200` before the page runs. The redirect then needs a script.
 */
export function proxy(request: NextRequest) {
	const vsCpu = request.nextUrl.pathname === `/${CPU_SEGMENT}`

	return NextResponse.redirect(new URL(runPath(createSeed(), vsCpu), request.url))
}

export const config = {
	matcher: ['/', '/cpu'],
}
