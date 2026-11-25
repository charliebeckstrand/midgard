'use client'

import { Bot, ChartColumn, LogIn, Menu as MenuIcon, Numbers, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Button } from 'ui/button'
import { useIdleLoad } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { useNewRunClick } from '../../hooks/use-new-run-click'
import { ROUTE_LABELS, type Route, VS_SEGMENT } from '../../utilities/seed'
import { LeaderboardDialog } from '../leaderboard-dialog'
import type { NumbersMenuProps } from './numbers-menu'

/** The code of the Stats dialog and its bar chart, which only a signed-in reader opens. */
const loadStatsDialog = () => import('../stats-dialog')

/**
 * The props of the item of `route`, when it is the route of the page: it is
 * the current item, and its label is extra bold (800). The token is `true`, not `page`,
 * because the link of the item opens another page: a new seed.
 */
function currentProps(route: Route, current: Route) {
	return route === current ? ({ 'aria-current': 'true', className: 'font-extrabold' } as const) : {}
}

/** Props for {@link NumbersMenuPanel}: the menu, and what it does when it opens. */
export type NumbersMenuPanelProps = NumbersMenuProps & {
	/** Moves the focus to the trigger when the menu opens, where the focus was on the button before. */
	focus: boolean
	/** Runs at each open after the first open, which `NumbersMenu` handles. */
	onOpen: () => void
}

/**
 * The menu at the right of the header. Standard starts the solo run of a new
 * seed, and Vs CPU starts the run of a new seed against the CPU. A divider sets
 * these routes apart from Leaderboard, which opens the boards of each day. Each reader gets it, so it
 * is above the second divider. Under the second divider are the items of the
 * account: a reader with no session gets Sign in, and a
 * signed-in reader gets Verify email (until the email is verified), Stats,
 * which opens the stats of the reader, and Sign out.
 *
 * A plain click on Standard or Vs CPU goes to the address of a new seed at
 * once, with no redirect (`useNewRunClick`). The address of each item, `/` or
 * `/vs`, is for a new tab.
 *
 * The item of the route of the page is bold, and it is the current item
 * (`aria-current`). The route comes from the props of the page, not from the
 * address after the hydration, so the item is marked at the first open.
 *
 * The Stats dialog and its bar chart load in idle time after the first open,
 * and only for a signed-in reader (`useIdleLoad`). A press on Stats before the
 * load opens the dialog when its code arrives.
 *
 * `NumbersMenu` loads this module in idle time, and renders the menu open in
 * place of its button on the first press.
 */
export function NumbersMenuPanel({ user, route, focus, onOpen }: NumbersMenuPanelProps) {
	const trigger = useRef<HTMLButtonElement>(null)

	// The trigger replaces the button of `NumbersMenu`, so the focus that the
	// keyboard put on that button goes to the trigger. The menu keeps the focus
	// on its trigger while it is open.
	useEffect(() => {
		if (focus) trigger.current?.focus()
	}, [focus])

	const [statsOpen, setStatsOpen] = useState(false)

	const statsDialog = useIdleLoad(user ? loadStatsDialog : null)

	const [leaderboardOpen, setLeaderboardOpen] = useState(false)

	const startSolo = useNewRunClick(false)

	const startVsCpu = useNewRunClick(true)

	return (
		<>
			<Menu
				placement="bottom-end"
				defaultOpen
				onOpenChange={(open) => {
					if (open) onOpen()
				}}
			>
				<MenuTrigger>
					<Button ref={trigger} variant="plain" aria-label="Menu">
						<Icon icon={<MenuIcon />} />
					</Button>
				</MenuTrigger>

				<MenuContent aria-label="Menu">
					<MenuItem href="/" onClick={startSolo} {...currentProps('solo', route)}>
						<Icon icon={<Numbers />} />
						<MenuLabel>{ROUTE_LABELS.solo}</MenuLabel>
					</MenuItem>

					<MenuItem href={`/${VS_SEGMENT}`} onClick={startVsCpu} {...currentProps('vsCpu', route)}>
						<Icon icon={<Bot />} />
						<MenuLabel>{ROUTE_LABELS.vsCpu}</MenuLabel>
					</MenuItem>

					<MenuSeparator />

					<MenuItem onAction={() => setLeaderboardOpen(true)}>
						<Icon icon={<Trophy />} />
						<MenuLabel>Leaderboard</MenuLabel>
					</MenuItem>

					<MenuSeparator />

					{user ? (
						<>
							<VerifyEmailMenuItem user={user} />

							<MenuItem onAction={() => setStatsOpen(true)}>
								<Icon icon={<ChartColumn />} />
								<MenuLabel>Stats</MenuLabel>
							</MenuItem>

							<SignOutMenuItem />
						</>
					) : (
						<MenuItem href="/login">
							<Icon icon={<LogIn />} />
							<MenuLabel>Sign in</MenuLabel>
						</MenuItem>
					)}
				</MenuContent>
			</Menu>

			{user && statsDialog && (
				<statsDialog.StatsDialog open={statsOpen} onOpenChange={setStatsOpen} user={user} />
			)}

			<LeaderboardDialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen} user={user} />
		</>
	)
}
