import { getSession } from 'auth'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Shell for the sign-in and register pages. A signed-in admin goes to the dashboard.
 *
 * @remarks
 * The proxy only finds the cookie, so this layout asks the gateway for the
 * session. A cookie that is not valid, or the session of a user that is not an
 * admin, gets the page.
 */
export default async function GuestLayout({ children }: { children: ReactNode }) {
	const session = await getSession()

	if (session?.user.role === 'admin') redirect('/')

	return children
}
