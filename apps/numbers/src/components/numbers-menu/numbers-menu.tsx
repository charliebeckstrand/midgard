'use client'

import type { User } from 'auth'
import { Menu as MenuIcon } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { Button } from 'ui/button'
import { useIntentLoad } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { usePrefetchBoards } from '../../queries/leaderboard-queries'
import { usePrefetchStats } from '../../queries/stats-queries'
import { dayKey } from '../../utilities/day'
import type { Route } from '../../utilities/seed'
import type { NumbersMenuPanel } from './numbers-menu-panel'

/**
 * Loads the module of the menu, which carries the menu code of ui and the
 * Leaderboard dialog. The page loads it in idle time after the hydration. Thus
 * a run page does not load that code before it hydrates, and the first press
 * does not wait for it.
 */
const loadMenu = () => import('./numbers-menu-panel')

/** Props for {@link NumbersMenu}. */
export type NumbersMenuProps = {
	/** The signed-in user, or none. Sign-in is optional. */
	user?: User
	/** The route of the page, which the menu marks. */
	route: Route
}

/**
 * The menu at the right of the header (`NumbersMenuPanel` gives its items).
 *
 * When the menu opens, it reads the boards of today for the reader, so
 * Leaderboard opens with its rows. Today is the date of the reader at the open,
 * so a route that shows again after midnight reads the new day. For a
 * signed-in reader with a verified email, the menu also reads the stats, so
 * Stats opens with its stats. The stats of any other reader are not read.
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
export function NumbersMenu(props: NumbersMenuProps) {
	const { user } = props

	const [menu, setMenu] = useState<{
		module: { NumbersMenuPanel: typeof NumbersMenuPanel }
		focus: boolean
	} | null>(null)

	const { request, preload } = useIntentLoad(loadMenu)

	const prefetchBoards = usePrefetchBoards(user?.id ?? null)

	const prefetchStats = usePrefetchStats()

	const prefetch = () => {
		prefetchBoards(dayKey(new Date()))

		if (user?.is_verified) prefetchStats()
	}

	if (menu !== null) {
		return <menu.module.NumbersMenuPanel {...props} focus={menu.focus} onOpen={prefetch} />
	}

	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		const focus = event.currentTarget === document.activeElement

		prefetch()

		request((module) => setMenu({ module, focus }))
	}

	return (
		<Button
			variant="plain"
			aria-label="Menu"
			aria-haspopup="menu"
			aria-expanded={false}
			onPointerEnter={preload}
			onPointerDown={preload}
			onFocus={preload}
			onClick={handleClick}
		>
			<Icon icon={<MenuIcon />} />
		</Button>
	)
}
