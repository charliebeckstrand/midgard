'use client'

import { type MouseEvent, type ReactElement, useState } from 'react'
import { useIntentLoad } from 'ui/hooks'
import type { UserMenuPanel } from './user-menu-panel'

/**
 * Loads the module of the menu, which carries the menu code of ui. A page loads
 * it in idle time after the hydration. Thus a signed-in page does not load the
 * menu code before it hydrates, and the first press does not wait for it.
 */
const loadMenu = () => import('./user-menu-panel')

/**
 * The props that {@link UserMenu} gives to its trigger before the first press:
 * the state of the closed menu, the handlers that start the load, and the press.
 */
export type UserMenuTriggerProps = {
	'aria-haspopup'?: 'menu'
	'aria-expanded'?: false
	onPointerEnter?: () => void
	onPointerDown?: () => void
	onFocus?: () => void
	onClick?: (event: MouseEvent<HTMLElement>) => void
}

/** Props for {@link UserMenu}. */
export type UserMenuProps = {
	placement: 'top-start' | 'bottom-end'
	/**
	 * Renders the trigger, a button. Spread the props on the button. The menu
	 * renders the trigger with no props once it is open.
	 */
	trigger: (props: UserMenuTriggerProps) => ReactElement
}

/**
 * User menu: the account link, and sign-out.
 *
 * @remarks The menu loads in idle time after the hydration. A pointer on the
 * trigger or a focus on it starts the load sooner. Until the first press, this
 * is the trigger alone. A press opens the menu, with its own trigger in place
 * of the first one. When the module is there, the menu opens in the render of
 * the press. Before that, it opens when the module arrives. A press from the
 * keyboard leaves the focus on the trigger, as the menu does.
 *
 * The menu replaces the trigger only on a press, not in idle time. A swap in
 * idle time can come between the pointer down and the click of a press, and
 * the press is then lost. A swap under a keyboard focus moves the focus to a
 * new element.
 */
export function UserMenu({ placement, trigger }: UserMenuProps) {
	const [menu, setMenu] = useState<{
		module: { UserMenuPanel: typeof UserMenuPanel }
		focus: boolean
	} | null>(null)

	const { request, preload } = useIntentLoad(loadMenu)

	if (menu !== null) {
		return (
			<menu.module.UserMenuPanel placement={placement} focus={menu.focus}>
				{trigger({})}
			</menu.module.UserMenuPanel>
		)
	}

	const handleClick = (event: MouseEvent<HTMLElement>) => {
		const focus = event.currentTarget === document.activeElement

		request((module) => setMenu({ module, focus }))
	}

	return trigger({
		'aria-haspopup': 'menu',
		'aria-expanded': false,
		onPointerEnter: preload,
		onPointerDown: preload,
		onFocus: preload,
		onClick: handleClick,
	})
}
