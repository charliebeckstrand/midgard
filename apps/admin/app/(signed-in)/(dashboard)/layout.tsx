import { requireAdmin } from 'auth'
import type { ReactNode } from 'react'

/**
 * The layout reads the session before it renders, because an admin page must
 * not show to a user that is not an admin. Thus a navigation from the account
 * page into the admin pages blocks. A navigation between the admin pages does
 * not wait.
 */
export const instant = false

/**
 * Gate of the admin pages. Requires the session of an admin that passed the
 * second step. The layout of the signed-in group gives the chrome.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
	await requireAdmin()

	return children
}
