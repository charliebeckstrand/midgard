import { getSession } from 'auth'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * The layout reads the session before it renders, so a navigation into it
 * waits for the gateway. This lets the route block. The session read moves into
 * a `<Suspense>` boundary in a later change.
 */
export const instant = false

/**
 * Shell for the sign-in and register pages. A signed-in user goes to the map.
 *
 * @remarks
 * The proxy only finds the cookie, so this layout asks the gateway for the
 * session. A cookie that is not valid gets the page. The root layout stops the
 * page scroll for the map, so this shell scrolls on its own.
 */
export default async function GuestLayout({ children }: { children: ReactNode }) {
	const session = await getSession()

	if (session) redirect('/')

	return <div className="h-full overflow-y-auto">{children}</div>
}
