'use client'

import { CircleUserRound } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { Button } from 'ui/button'
import { useIntentLoad } from 'ui/hooks'
import { Icon } from 'ui/icon'
import type { UserMenuPanel, UserMenuProps } from './user-menu-panel'

/**
 * Loads the module of the menu, which carries the menu code of ui. The page
 * loads it in idle time after the hydration. Thus the home page does not load
 * the menu code before it hydrates, and the first press does not wait for it.
 */
const loadMenu = () => import('./user-menu-panel')

/**
 * The menu of the signed-in user: add a place, open the list, and sign out. A
 * user whose email is not verified can also send a verification link.
 *
 * @remarks The menu loads in idle time after the hydration. A pointer on the
 * button or a focus on it starts the load sooner. Until the first press, this
 * is the button of the menu alone. A press opens the menu, with its trigger in
 * place of the button. When the module is there, the menu opens in the render
 * of the press. Before that, it opens when the module arrives. A press from the
 * keyboard leaves the focus on the trigger, as the menu does.
 *
 * The trigger replaces the button only on a press, not in idle time. A swap in
 * idle time can come between the pointer down and the click of a press, and
 * the press is then lost. A swap under a keyboard focus moves the focus to a
 * new element.
 */
export function UserMenu(props: UserMenuProps) {
	const [menu, setMenu] = useState<{
		module: { UserMenuPanel: typeof UserMenuPanel }
		focus: boolean
	} | null>(null)

	const { request, preload } = useIntentLoad(loadMenu)

	if (menu !== null) return <menu.module.UserMenuPanel {...props} focus={menu.focus} />

	const press = (event: MouseEvent<HTMLButtonElement>) => {
		const focus = event.currentTarget === document.activeElement

		request((module) => setMenu({ module, focus }))
	}

	return (
		<Button
			variant="bare"
			aria-label="User menu"
			aria-haspopup="menu"
			aria-expanded={false}
			onPointerEnter={preload}
			onPointerDown={preload}
			onFocus={preload}
			onClick={press}
		>
			<Icon icon={<CircleUserRound />} />
		</Button>
	)
}
