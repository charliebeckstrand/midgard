'use client'

import {
	ArrowRightStartOnRectangleIcon,
	ChevronUpDownIcon,
	Cog8ToothIcon,
} from '@heroicons/react/20/solid'
import { useRouter } from 'next/navigation'
import { Avatar } from 'ui/avatar'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { SidebarItem, SidebarLabel } from 'ui/sidebar'

type User = { email: string; name?: string }

export function SidebarUserMenu({ user }: { user?: User }) {
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
