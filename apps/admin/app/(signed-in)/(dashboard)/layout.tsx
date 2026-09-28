import { requireAdmin } from 'auth'
import type { ReactNode } from 'react'

/**
 * Gate of the admin pages. Requires the session of an admin that passed the
 * second step. The layout of the signed-in group gives the chrome.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
	await requireAdmin()

	return children
}
