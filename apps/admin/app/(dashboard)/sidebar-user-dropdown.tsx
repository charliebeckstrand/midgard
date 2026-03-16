'use client'

import {
	ArrowRightStartOnRectangleIcon,
	ChevronUpDownIcon,
	Cog8ToothIcon,
} from '@heroicons/react/20/solid'
import { useRouter } from 'next/navigation'
import { Avatar } from 'ui/avatar'
import {
	Dropdown,
	DropdownButton,
	DropdownDivider,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
} from 'ui/dropdown'
import { SidebarItem, SidebarLabel } from 'ui/sidebar'

type User = { email: string; name?: string }

export function SidebarUserDropdown({ user }: { user?: User }) {
	const router = useRouter()

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		router.push('/login')
	}

	const displayName = user?.email ?? 'Account'

	const initials = user?.email?.[0]?.toUpperCase() ?? 'U'

	return (
		<Dropdown>
			<DropdownButton as={SidebarItem}>
				<Avatar
					initials={initials}
					className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
				/>
				<SidebarLabel>{displayName}</SidebarLabel>
				<ChevronUpDownIcon />
			</DropdownButton>
			<DropdownMenu anchor="top start" className="min-w-64">
				<DropdownItem href="/settings">
					<Cog8ToothIcon />
					<DropdownLabel>Settings</DropdownLabel>
				</DropdownItem>
				<DropdownDivider />
				<DropdownItem onClick={signOut}>
					<ArrowRightStartOnRectangleIcon />
					<DropdownLabel>Sign out</DropdownLabel>
				</DropdownItem>
			</DropdownMenu>
		</Dropdown>
	)
}
