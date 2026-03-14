'use client'

import { UsersIcon } from '@heroicons/react/20/solid'
import {
	Navbar,
	NavbarSpacer,
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarLayout,
	SidebarSection,
} from 'catalyst'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
	const pathname = usePathname()

	return (
		<SidebarLayout
			navbar={
				<Navbar>
					<NavbarSpacer />
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarBody>
						<SidebarSection>
							<SidebarItem href="/users" current={pathname.startsWith('/users')}>
								<UsersIcon />
								<SidebarLabel>Users</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarBody>
				</Sidebar>
			}
		>
			{children}
		</SidebarLayout>
	)
}
