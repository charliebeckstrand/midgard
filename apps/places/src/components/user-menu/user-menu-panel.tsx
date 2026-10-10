'use client'

import type { User } from 'auth'
import { CircleUserRound, Luggage, MapPinned, Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'

/** Props for {@link UserMenuPanel}. */
export type UserMenuProps = {
	user: User
	/** The number of places that My places opens on, or `undefined` to show no count. */
	count?: number
	onAdd: () => void
	/** Opens My places. Without it, the menu has no My places item. */
	onList?: () => void
	/** The number of trips that My trips opens on, or `undefined` to show no count. */
	tripCount?: number
	onAddTrip: () => void
	/** Opens My trips. Without it, the menu has no My trips item. */
	onListTrips?: () => void
}

/** The words of a list item, with its count where there is one. */
function counted(label: string, count: number | undefined): string {
	return count === undefined ? label : `${label} (${count})`
}

/** Props for {@link UserMenuPanel}: the menu, and where the focus goes when it opens. */
export type UserMenuPanelProps = UserMenuProps & {
	/** Moves the focus to the trigger when the menu opens, where the focus was on the button before. */
	focus: boolean
}

/**
 * The menu of the signed-in user, in three groups: the places, the trips, and
 * the account. Each record group adds one record and opens its list, and a
 * list item shows only once there is a record to list. A user whose email is
 * not verified can also send a verification link, because records can't be
 * changed until it is. The heading is the name of the user,
 * with the email below it. A user with no name gets the email as the heading.
 *
 * @remarks The verification and sign-out items are `VerifyEmailMenuItem` and
 * `SignOutMenuItem` from `shared/auth`.
 *
 * `UserMenu` loads this module in idle time, and renders the menu open in
 * place of its button on the first press.
 */
export function UserMenuPanel({
	user,
	count,
	onAdd,
	onList,
	tripCount,
	onAddTrip,
	onListTrips,
	focus,
}: UserMenuPanelProps) {
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
						<MenuLabel>{counted('My places', count)}</MenuLabel>
					</MenuItem>
				)}

				<MenuSeparator />

				<MenuItem onAction={onAddTrip}>
					<Icon icon={<Plus />} />
					<MenuLabel>Add trip</MenuLabel>
				</MenuItem>

				{onListTrips === undefined ? null : (
					<MenuItem onAction={onListTrips}>
						<Icon icon={<Luggage />} />
						<MenuLabel>{counted('My trips', tripCount)}</MenuLabel>
					</MenuItem>
				)}

				<MenuSeparator />

				<VerifyEmailMenuItem user={user} />

				<SignOutMenuItem />
			</MenuContent>
		</Menu>
	)
}
