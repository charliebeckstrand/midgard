'use client'

import type { User } from 'auth'
import { CircleUserRound, MapPinned, Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'

/** Props for {@link UserMenuPanel}. */
export type UserMenuProps = {
	user: User
	/** The number of places that the list opens on, or `undefined` to show no count. */
	count?: number
	onAdd: () => void
	/** Opens the list. Without it, the menu has no list item. */
	onList?: () => void
}

/** Props for {@link UserMenuPanel}: the menu, and where the focus goes when it opens. */
export type UserMenuPanelProps = UserMenuProps & {
	/** Moves the focus to the trigger when the menu opens, where the focus was on the button before. */
	focus: boolean
}

/**
 * The menu of the signed-in user: add a place, open the list, and sign out. A
 * user whose email is not verified can also send a verification link, since
 * places can't be changed until it is. The heading is the name of the user,
 * with the email below it. A user with no name gets the email as the heading.
 *
 * @remarks The verification and sign-out items are `VerifyEmailMenuItem` and
 * `SignOutMenuItem` from `shared/auth`.
 *
 * `UserMenu` loads this module in idle time, and renders the menu open in
 * place of its button on the first press.
 */
export function UserMenuPanel({ user, count, onAdd, onList, focus }: UserMenuPanelProps) {
	const trigger = useRef<HTMLButtonElement>(null)

	// The trigger replaces the button of `UserMenu`, so the focus that the
	// keyboard put on that button goes to the trigger. The menu keeps the focus
	// on its trigger while it is open.
	useEffect(() => {
		if (focus) trigger.current?.focus()
	}, [focus])

	return (
		<Menu placement="bottom-end" defaultOpen>
			<MenuTrigger>
				<Button ref={trigger} variant="bare" aria-label="User menu">
					<Icon icon={<CircleUserRound />} />
				</Button>
			</MenuTrigger>

			<MenuContent title={user.name ?? user.email} description={user.name ? user.email : undefined}>
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

				<VerifyEmailMenuItem user={user} />

				<SignOutMenuItem />
			</MenuContent>
		</Menu>
	)
}
