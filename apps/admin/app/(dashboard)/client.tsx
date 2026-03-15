'use client'

import { UsersIcon } from '@heroicons/react/20/solid'
import {
	Navbar,
	NavbarSpacer,
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarLayout,
	SidebarSection,
} from 'catalyst'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { ShinyText } from 'reactbits'
import { SidebarUserFooter } from './sidebar-footer'

type User = { email: string; name?: string }

export function DashboardClient({ user, children }: { user?: User; children: ReactNode }) {
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
					<SidebarHeader>
						<SidebarItem href="/" current={pathname === '/'}>
							<img src="/gradient.png" alt="gradient" width={24} height={24} />
							<SidebarLabel>
								<ShinyText text="Admin" className="font-black text-lg" delay={10} yoyo />
							</SidebarLabel>
						</SidebarItem>
					</SidebarHeader>
					<SidebarBody>
						<SidebarSection>
							<SidebarItem href="/users" current={pathname.startsWith('/users')}>
								<UsersIcon />
								<SidebarLabel>Users</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarBody>
					<SidebarUserFooter user={user} />
				</Sidebar>
			}
		>
			{children}
		</SidebarLayout>
	)
}
