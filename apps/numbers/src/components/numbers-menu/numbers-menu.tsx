'use client'

import type { User } from 'auth'
import {
	Bot,
	CalendarDays,
	ChartColumn,
	LogIn,
	Menu as MenuIcon,
	Trophy,
	UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { useToday } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { usePrefetchBoards } from '../../queries/leaderboard-queries'
import { useStats } from '../../queries/stats-queries'
import { SLOTS } from '../../utilities/game'
import { dailySeed, type Route, VS_SEGMENT } from '../../utilities/seed'
import { LeaderboardDialog } from '../leaderboard-dialog'
import { StatsDialog } from '../stats-dialog'

/**
 * The props of the item of `route`, when it is the route of the page: it is
 * the current page, and its label is bold.
 */
function currentProps(route: Route, current: Route) {
	return route === current ? ({ 'aria-current': 'page', className: 'font-semibold' } as const) : {}
}

/**
 * The link to the daily puzzle of `today`. After the first run of the puzzle
 * counts, the item shows its `score` in a small green badge after its label,
 * at the gap of the row, such as "12/20".
 */
function DailyPuzzleItem({
	today,
	score,
	route,
}: {
	today: Date
	score: number | null
	route: Route
}) {
	return (
		<MenuItem href={`/${dailySeed(today)}`} {...currentProps('daily', route)}>
			<Icon icon={<CalendarDays />} />
			<MenuLabel>Daily puzzle</MenuLabel>
			{score !== null && (
				<Badge color="green" size="sm">
					{`${score}/${SLOTS}`}
				</Badge>
			)}
		</MenuItem>
	)
}

/** Props for {@link NumbersMenu}. */
export type NumbersMenuProps = {
	/** The signed-in user, or none. Sign-in is optional. */
	user?: User
	/** The route of the page, which the menu marks. */
	route: Route
}

/**
 * The menu at the right of the header. Solo starts the run of a new seed, and
 * Vs CPU starts the run of a new seed against the CPU. Daily puzzle opens the
 * run of the seed of today, which each reader gets on the same date, and shows
 * its score once its first run counts. A divider sets these routes apart from
 * Leaderboard, which opens the boards of each day. Each reader gets it, so it
 * is above the second divider. Under the second divider are the items of the
 * account: a reader with no session gets Sign in, and a
 * signed-in reader gets Verify email (until the email is verified), Stats,
 * which opens the stats of the reader, and Sign out.
 *
 * The item of the route of the page is bold, and it is the current page
 * (`aria-current`). The route comes from the props of the page, not from the
 * address after the hydration, so the item is marked at the first open. A
 * daily puzzle of an earlier day is on Daily puzzle.
 *
 * Today is the date of the reader, which the server cannot know, so `useToday`
 * gives it after the hydration, and moves it to the next day at midnight. The
 * menu then reads the stats of a signed-in reader with a verified email, before
 * the menu opens. Thus the score of the daily puzzle shows when the menu opens,
 * and the Stats dialog opens with its stats. The stats of any other reader are
 * not read, and the item stays a plain link.
 */
export function NumbersMenu({ user, route }: NumbersMenuProps) {
	const today = useToday()

	const { data } = useStats(
		today ? dailySeed(today) : '',
		today !== null && user?.is_verified === true,
	)

	const score = data?.solo.dailyScore ?? null

	const [statsOpen, setStatsOpen] = useState(false)

	const [leaderboardOpen, setLeaderboardOpen] = useState(false)

	const prefetchBoards = usePrefetchBoards()

	return (
		<>
			<Menu
				placement="bottom-end"
				onOpenChange={(open) => {
					if (open && today) prefetchBoards(dailySeed(today))
				}}
			>
				<MenuTrigger>
					<Button variant="plain" aria-label="Menu">
						<Icon icon={<MenuIcon />} />
					</Button>
				</MenuTrigger>

				<MenuContent aria-label="Menu">
					<MenuItem href="/" {...currentProps('solo', route)}>
						<Icon icon={<UserRound />} />
						<MenuLabel>Solo</MenuLabel>
					</MenuItem>

					<MenuItem href={`/${VS_SEGMENT}`} {...currentProps('vsCpu', route)}>
						<Icon icon={<Bot />} />
						<MenuLabel>Vs CPU</MenuLabel>
					</MenuItem>

					{today && <DailyPuzzleItem today={today} score={score} route={route} />}

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
