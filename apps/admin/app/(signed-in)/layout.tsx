import { requireSession } from 'auth'
import type { ReactNode } from 'react'
import { SignedInClient } from './client'

/**
 * The layout reads the session before it renders, so a navigation into it waits for the
 * gateway. This lets the route block. The read moves into a `<Suspense>`
 * boundary in a later change.
 */
export const instant = false

/**
 * Shell of each signed-in page. Requires a session, and hands its user to the
 * {@link SignedInClient} chrome.
 *
 * @remarks
 * An admin that passed the second step gets the sidebar, and each other user
 * gets the header. The admin pages add their own check in the layout of the
 * `(dashboard)` group. This layout only picks the chrome.
 */
export default async function SignedInLayout({ children }: { children: ReactNode }) {
	const { user, two_step } = await requireSession()

	return (
		<SignedInClient user={user} admin={user.roles.includes('admin') && two_step}>
			{children}
		</SignedInClient>
	)
}
