'use client'

import {
	ArrowRightStartOnRectangleIcon,
	ChevronUpDownIcon,
	Cog8ToothIcon,
	UsersIcon,
} from '@heroicons/react/20/solid'
import type { User } from 'auth/user'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Avatar } from 'ui/avatar'
import { SidebarLayout } from 'ui/layouts'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
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

type DashboardClientProps = {
	user?: User
	children: ReactNode
}

/**
 * Dashboard chrome: sidebar navigation and navbar around the routed content.
 *
 * @remarks Highlights the active nav item from the current pathname.
 */
export function DashboardClient({ user, children }: DashboardClientProps) {
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

/**
 * Sidebar footer account menu: settings link and sign-out.
 *
 * @internal
 * @remarks Sign-out POSTs `/auth/logout` then routes to `/login`. Falls back to
 *   the email initial / "Account" label when no user is resolved.
 */
function SidebarUserMenu({ user }: { user?: User }) {
	const router = useRouter()

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		router.push('/login')
	}

	const displayName = user?.email ?? 'Account'

	const initials = user?.email?.[0]?.toUpperCase() ?? 'U'

	return (
		<Menu placement="top-start">
			<MenuTrigger>
				<SidebarItem>
					<Avatar
						initials={initials}
						className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
					/>
					<SidebarLabel>{displayName}</SidebarLabel>
					<ChevronUpDownIcon />
				</SidebarItem>
			</MenuTrigger>
			<MenuContent>
				<MenuItem href="/settings">
					<Cog8ToothIcon />
					<MenuLabel>Settings</MenuLabel>
				</MenuItem>
				<MenuSeparator />
				<MenuItem onClick={signOut}>
					<ArrowRightStartOnRectangleIcon />
					<MenuLabel>Sign out</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
