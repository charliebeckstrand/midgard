const guestRoutes = ['/login', '/register']

/**
 * True when `pathname` is a guest route (`/login`, `/register`) or one of their
 * subpaths. Matches on path boundaries so `/login-help` is not treated as `/login`.
 */
export function isGuestRoute(pathname: string): boolean {
	return guestRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * True when `pathname` is a same-origin API route (`/api`) or one of its
 * subpaths. Matches on path boundaries, so `/apis` is not an API route.
 */
export function isApiRoute(pathname: string): boolean {
	return pathname === '/api' || pathname.startsWith('/api/')
}
