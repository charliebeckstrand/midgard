'use client'

import type { User } from 'auth'
import { Bot, ChartColumn, LogIn, Menu as MenuIcon, Numbers, Trophy } from 'lucide-react'
import { useState } from 'react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { useNewRunClick } from '../../hooks/use-new-run-click'
import { usePrefetchBoards } from '../../queries/leaderboard-queries'
import { usePrefetchStats } from '../../queries/stats-queries'
import { dayKey } from '../../utilities/day'
import { ROUTE_LABELS, type Route, VS_SEGMENT } from '../../utilities/seed'
import { LeaderboardDialog } from '../leaderboard-dialog'
import { StatsDialog } from '../stats-dialog'

/**
 * The props of the item of `route`, when it is the route of the page: it is
 * the current item, and its label is extra bold (800). The token is `true`, not `page`,
 * because the link of the item opens another page: a new seed.
 */
function currentProps(route: Route, current: Route) {
	return route === current ? ({ 'aria-current': 'true', className: 'font-extrabold' } as const) : {}
}

/** Props for {@link NumbersMenu}. */
export type NumbersMenuProps = {
	/** The signed-in user, or none. Sign-in is optional. */
	user?: User
	/** The route of the page, which the menu marks. */
	route: Route
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
 * When the menu opens, it reads the boards of today for the reader, so
 * Leaderboard opens with its rows. Today is the date of the reader at the open,
 * so a route that shows again after midnight reads the new day. For a
 * signed-in reader with a verified email, the menu also reads the stats, so
 * Stats opens with its stats. The stats of any other reader are not read.
 */
export function NumbersMenu({ user, route }: NumbersMenuProps) {
	const [statsOpen, setStatsOpen] = useState(false)

	const [leaderboardOpen, setLeaderboardOpen] = useState(false)

	const prefetchBoards = usePrefetchBoards(user?.id ?? null)

	const prefetchStats = usePrefetchStats()

	const startSolo = useNewRunClick(false)

	const startVsCpu = useNewRunClick(true)

	return (
		<>
			<Menu
				placement="bottom-end"
				onOpenChange={(open) => {
					if (!open) return

					prefetchBoards(dayKey(new Date()))

					if (user?.is_verified) prefetchStats()
				}}
			>
				<MenuTrigger>
					<Button variant="plain" aria-label="Menu">
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

			{user && <StatsDialog open={statsOpen} onOpenChange={setStatsOpen} user={user} />}

			<LeaderboardDialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen} user={user} />
		</>
	)
}
