import { getUser } from 'auth'
import type { ReactNode } from 'react'
import { DashboardClient } from './client'

/**
 * Authenticated shell for the dashboard segment. Resolves the current user
 * server-side and hands it to the interactive {@link DashboardClient} chrome.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const user = await getUser()

	return <DashboardClient user={user}>{children}</DashboardClient>
}
