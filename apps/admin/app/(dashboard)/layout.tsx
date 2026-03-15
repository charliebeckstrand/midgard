import { getUser } from 'heimdall'
import type { ReactNode } from 'react'
import { DashboardClient } from './client'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const { user } = await getUser()

	return <DashboardClient user={user}>{children}</DashboardClient>
}
