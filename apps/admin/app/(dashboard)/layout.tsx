import { requireAdmin } from 'auth'
import type { ReactNode } from 'react'
import { DashboardClient } from './client'

/**
 * Authenticated shell for the dashboard segment. Requires the session of an
 * admin, and hands its user to the interactive {@link DashboardClient} chrome.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const { user } = await requireAdmin()

	return <DashboardClient user={user}>{children}</DashboardClient>
}
