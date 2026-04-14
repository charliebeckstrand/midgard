'use client'

import { UsersIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { SidebarLayout } from 'ui/layouts'
import { Navbar } from 'ui/navbar'
import {
	Sidebar,
	SidebarBody,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from 'ui/sidebar'
import { Spacer } from 'ui/spacer'
import { Text } from 'ui/text'
import { SidebarUserMenu } from './sidebar-user-menu'

type User = { email: string; name?: string }

export function DashboardClient({ user, children }: { user?: User; children: ReactNode }) {
	const pathname = usePathname()

	return (
		<SidebarLayout
			navbar={
				<Navbar>
					<Spacer />
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarItem href="/" current={pathname === '/'}>
							<img src="/gradient.png" alt="gradient" width={24} height={24} />
							<SidebarLabel>
								<Text className="font-black text-lg">Admin</Text>
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
					<SidebarFooter>
						<SidebarUserMenu user={user} />
					</SidebarFooter>
				</Sidebar>
			}
		>
			{children}
		</SidebarLayout>
	)
}
