import { requireSession } from 'auth'
import type { ReactNode } from 'react'
import { SignedInClient } from './client'

/**
 * The layout reads the session before it renders, because the session selects
 * the chrome. A fallback chrome would change when the session arrives, so the
 * route blocks. A navigation between the pages under the layout does not wait.
 */
export const instant = false

/**
 * Shell of each signed-in page. Requires a session, and hands its user to the
 * {@link SignedInClient} chrome.
 *
 * @remarks
 * An admin gets the sidebar, and each other user gets the header. The role
 * picks the chrome, not the second step. The second step can pass while a page
 * is open. A change of the chrome at that time mounts the page again, and the
 * page loses its state, for example the recovery codes that show only one time.
 * The role does not change while a page is open. The admin pages add their own
 * check in the layout of the `(dashboard)` group, and send an admin without the
 * second step to `/verify`. This layout only picks the chrome.
 */
export default async function SignedInLayout({ children }: { children: ReactNode }) {
	const { user } = await requireSession()

	return (
		<SignedInClient user={user} admin={user.roles.includes('admin')}>
			{children}
		</SignedInClient>
	)
}
