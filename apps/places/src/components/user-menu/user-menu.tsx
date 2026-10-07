'use client'

import { CircleUserRound } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import type { UserMenuPanel, UserMenuProps } from './user-menu-panel'

/**
 * Loads the module of the menu, which carries the menu code of ui. The page
 * loads it on the first press of the button, so the home page does not load
 * the menu code before it hydrates.
 */
const loadMenu = () => import('./user-menu-panel')

/** Starts the load for a reader who shows intent: a pointer or a focus on the button. */
const preloadMenu = () => void loadMenu()

/**
 * The menu of the signed-in user: add a place, open the list, and sign out. A
 * user whose email is not verified can also send a verification link.
 *
 * @remarks The menu loads on demand. Until the first press, this is the button
 * of the menu alone. A pointer on the button or a focus on it starts the load.
 * A press opens the menu when the module is there, with its trigger in place of
 * the button. A press from the keyboard leaves the focus on the trigger, as the
 * menu does.
 */
export function UserMenu(props: UserMenuProps) {
	const [menu, setMenu] = useState<{
		module: { UserMenuPanel: typeof UserMenuPanel }
		focus: boolean
	} | null>(null)

	if (menu !== null) return <menu.module.UserMenuPanel {...props} focus={menu.focus} />

	const press = (event: MouseEvent<HTMLButtonElement>) => {
		const focus = event.currentTarget === document.activeElement

		void loadMenu().then((module) => setMenu({ module, focus }))
	}

	return (
		<Button
			variant="plain"
			aria-label="User menu"
			aria-haspopup="menu"
			aria-expanded={false}
			onPointerEnter={preloadMenu}
			onPointerDown={preloadMenu}
			onFocus={preloadMenu}
			onClick={press}
		>
			<Icon icon={<CircleUserRound />} />
		</Button>
	)
}
