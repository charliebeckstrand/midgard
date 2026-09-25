const guestRoutes = ['/login', '/register']

// Matches on a path boundary, so `/login-help` is not within `/login`.
function isWithin(pathname: string, route: string): boolean {
	return pathname === route || pathname.startsWith(`${route}/`)
}

/**
 * True when `pathname` is a guest route (`/login`, `/register`) or a subpath of one.
 *
 * @internal
 */
export function isGuestRoute(pathname: string): boolean {
	return guestRoutes.some((route) => isWithin(pathname, route))
}

/**
 * True when `pathname` is the same-origin API route (`/api`) or a subpath of it.
 *
 * @internal
 */
export function isApiRoute(pathname: string): boolean {
	return isWithin(pathname, '/api')
}
