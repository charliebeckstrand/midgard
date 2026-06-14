const guestRoutes = ['/login', '/register']

/**
 * True when `pathname` is a guest route (`/login`, `/register`) or one of their
 * subpaths. Matches on path boundaries so `/login-help` is not treated as `/login`.
 */
export function isGuestRoute(pathname: string): boolean {
	return guestRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
