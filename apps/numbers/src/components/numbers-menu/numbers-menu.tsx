'use client'

import type { User } from 'auth'
import {
	Bot,
	CalendarDays,
	ChartColumn,
	CircleCheck,
	LogIn,
	Menu as MenuIcon,
	Trophy,
	UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Button } from 'ui/button'
import { useToday } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { usePrefetchBoards } from '../../queries/leaderboard-queries'
import { useStats } from '../../queries/stats-queries'
import { dailySeed, VS_SEGMENT } from '../../utilities/seed'
import { LeaderboardDialog } from '../leaderboard-dialog'
import { StatsDialog } from '../stats-dialog'

/**
 * The link to the daily puzzle of `today`. After the first run of the puzzle
 * counts (`played`), the item shows a green check after its label, at the gap
 * of the row.
 */
function DailyPuzzleItem({ today, played }: { today: Date; played: boolean }) {
	return (
		<MenuItem href={`/${dailySeed(today)}`}>
			<Icon icon={<CalendarDays />} />
			<MenuLabel>Daily puzzle</MenuLabel>
			{played && (
				<Icon
					icon={<CircleCheck />}
					label="Played"
					className="text-green-600 dark:text-green-500"
				/>
			)}
		</MenuItem>
	)
}

/** Props for {@link NumbersMenu}. */
export type NumbersMenuProps = {
	/** The signed-in user, or none. Sign-in is optional. */
	user?: User
}

/**
 * The menu at the right of the header. Solo starts the run of a new seed, and
 * Vs CPU starts the run of a new seed against the CPU. Daily puzzle opens the
 * run of the seed of today, which each reader gets on the same date, and shows
 * a check once its first run counts. A divider sets these routes apart from
 * Leaderboard, which opens the boards of each day. Each reader gets it, so it
 * is above the second divider. Under the second divider are the items of the
 * account: a reader with no session gets Sign in, and a
 * signed-in reader gets Verify email (until the email is verified), Stats,
 * which opens the stats of the reader, and Sign out.
 *
 * Today is the date of the reader, which the server cannot know, so `useToday`
 * gives it after the hydration, and moves it to the next day at midnight. The
 * menu then reads the stats of a signed-in reader with a verified email, before
 * the menu opens. Thus the check of the daily puzzle shows when the menu opens,
 * and the Stats dialog opens with its stats. The stats of any other reader are
 * not read, and the item stays a plain link.
 */
export function NumbersMenu({ user }: NumbersMenuProps) {
	const today = useToday()

	const { data } = useStats(
		today ? dailySeed(today) : '',
		today !== null && user?.is_verified === true,
	)

	const played = data !== undefined && data.solo.dailyScore !== null

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
					<MenuItem href="/">
						<Icon icon={<UserRound />} />
						<MenuLabel>Solo</MenuLabel>
					</MenuItem>

					<MenuItem href={`/${VS_SEGMENT}`}>
						<Icon icon={<Bot />} />
						<MenuLabel>Vs CPU</MenuLabel>
					</MenuItem>

					{today && <DailyPuzzleItem today={today} played={played} />}

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
