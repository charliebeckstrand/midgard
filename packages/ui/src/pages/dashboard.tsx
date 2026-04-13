import type React from 'react'
import { Stack } from '../components/stack'
import { DashboardLayout } from '../layouts/dashboard'

export type DashboardPageProps = {
	heading?: React.ReactNode
	filters?: React.ReactNode
	children: React.ReactNode
}

export function DashboardPage({ heading, filters, children }: DashboardPageProps) {
	return (
		<DashboardLayout filters={filters}>
			<Stack gap={6}>
				{heading}
				{children}
			</Stack>
		</DashboardLayout>
	)
}
