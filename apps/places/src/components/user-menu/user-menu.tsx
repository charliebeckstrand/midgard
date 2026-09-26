'use client'

import type { User } from 'auth'
import { CircleUserRound, LogOut, MapPinned, Plus } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import {
	Menu,
	MenuContent,
	MenuHeading,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from 'ui/menu'

type UserMenuProps = {
	user: User
	/** The number of places that the list opens on, or `undefined` to show no count. */
	count?: number
	onAdd: () => void
	/** Opens the list. Without it, the menu has no list item. */
	onList?: () => void
}

/**
 * The menu of the signed-in user: add a place, open the list, and sign out.
 *
 * @remarks Sign-out POSTs `/auth/logout`, then loads `/login`.
 */
export function UserMenu({ user, count, onAdd, onList }: UserMenuProps) {
	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		// A full load, so no data of the user stays in the query cache.
		window.location.assign('/login')
	}

	return (
		<Menu placement="bottom-end">
			<MenuTrigger>
				<Button variant="plain" aria-label="User menu">
					<Icon icon={<CircleUserRound />} />
				</Button>
			</MenuTrigger>

			<MenuContent>
				<MenuSection>
					<MenuHeading>{user.email}</MenuHeading>

					<MenuItem onAction={onAdd}>
						<Icon icon={<Plus />} />
						<MenuLabel>Add place</MenuLabel>
					</MenuItem>

					{onList === undefined ? null : (
						<MenuItem onAction={onList}>
							<Icon icon={<MapPinned />} />
							<MenuLabel>{count === undefined ? 'My places' : `My places (${count})`}</MenuLabel>
						</MenuItem>
					)}
				</MenuSection>

				<MenuSeparator />

				<MenuItem onAction={signOut}>
					<Icon icon={<LogOut />} />
					<MenuLabel>Sign out</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
