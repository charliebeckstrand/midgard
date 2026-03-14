import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Dashboard',
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return <div className="flex flex-1 h-screen">{children}</div>
}
