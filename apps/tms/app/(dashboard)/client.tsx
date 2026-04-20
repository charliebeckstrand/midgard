'use client'

import {
	ArchiveBoxIcon,
	ArrowRightStartOnRectangleIcon,
	ChatBubbleLeftRightIcon,
	Cog8ToothIcon,
	TruckIcon,
	UsersIcon,
} from '@heroicons/react/20/solid'
import type { User } from 'heimdall/user'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { SidebarLayout } from 'ui/layouts'
import {
	Sidebar,
	SidebarBody,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from 'ui/sidebar'
import { Text } from 'ui/text'

export function DashboardClient({ user: _user, children }: { user?: User; children: ReactNode }) {
	const pathname = usePathname()

	const router = useRouter()

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		router.push('/login')
	}

	return (
		<SidebarLayout
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarItem>
							<SidebarLabel>
								<Text className="font-black text-lg">TMS</Text>
							</SidebarLabel>
						</SidebarItem>
					</SidebarHeader>
					<SidebarBody>
						<SidebarSection>
							<SidebarItem href="/shipments" current={pathname.startsWith('/shipments')}>
								<ArchiveBoxIcon />
								<SidebarLabel>Shipments</SidebarLabel>
							</SidebarItem>
							<SidebarItem href="/carriers" current={pathname.startsWith('/carriers')}>
								<TruckIcon />
								<SidebarLabel>Carriers</SidebarLabel>
							</SidebarItem>
							<SidebarItem href="/customers" current={pathname.startsWith('/customers')}>
								<UsersIcon />
								<SidebarLabel>Customers</SidebarLabel>
							</SidebarItem>
							<SidebarItem href="/chat" current={pathname.startsWith('/chat')}>
								<ChatBubbleLeftRightIcon />
								<SidebarLabel>Chat</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarBody>
					<SidebarFooter>
						<SidebarSection>
							<SidebarItem href="/settings" current={pathname.startsWith('/settings')}>
								<Cog8ToothIcon />
								<SidebarLabel>Settings</SidebarLabel>
							</SidebarItem>
							<SidebarItem onClick={signOut}>
								<ArrowRightStartOnRectangleIcon />
								<SidebarLabel>Log out</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarFooter>
				</Sidebar>
			}
		>
			{children}
		</SidebarLayout>
	)
}
