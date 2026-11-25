'use client'

import { KeyIcon } from '@heroicons/react/20/solid'
import { type ReactNode, useEffect, useRef } from 'react'
import { SignOutMenuItem } from 'shared/auth'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'

/** Props for {@link UserMenuPanel}. */
export type UserMenuPanelProps = {
	placement: 'top-start' | 'bottom-end'
	/** Moves the focus to the trigger when the menu opens, where the focus was on the trigger before. */
	focus: boolean
	/** The trigger. */
	children: ReactNode
}

/**
 * The menu of the user: the account link, and sign-out. It opens on its mount.
 *
 * @remarks Sign-out is `SignOutMenuItem` from `shared/auth`.
 *
 * `UserMenu` loads this module in idle time, and renders the menu open in
 * place of its trigger on the first press.
 */
export function UserMenuPanel({ placement, focus, children }: UserMenuPanelProps) {
	const trigger = useRef<HTMLButtonElement>(null)

	// The trigger of the menu replaces the trigger of `UserMenu`, so the focus
	// that the keyboard put on that trigger goes to the new one. The menu keeps
	// the focus on its trigger while it is open.
	useEffect(() => {
		if (focus) trigger.current?.focus()
	}, [focus])

	return (
		<Menu placement={placement} defaultOpen>
			<MenuTrigger ref={trigger}>{children}</MenuTrigger>
			<MenuContent>
				<MenuItem href="/account">
					<KeyIcon />
					<MenuLabel>Account</MenuLabel>
				</MenuItem>
				<MenuSeparator />
				<SignOutMenuItem />
			</MenuContent>
		</Menu>
	)
}
