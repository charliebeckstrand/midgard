'use client'

import type { User } from 'auth'
import {
	Bot,
	CalendarDays,
	ChartColumn,
	CircleCheck,
	House,
	LogIn,
	Menu as MenuIcon,
} from 'lucide-react'
import { useState } from 'react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Button } from 'ui/button'
import { useToday } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { useStats } from '../../queries/stats-queries'
import { dailySeed, VS_SEGMENT } from '../../utilities/seed'
import { StatsDialog } from '../stats-dialog'

/**
 * The link to the daily puzzle of today. Today is the date of the reader, which
 * the server cannot know. The link renders only in the open menu, a mount after
 * the hydration, so `useToday` gives the day in the first render, and moves the
 * link to the next day at midnight.
 *
 * After the first run of the puzzle counts, the item shows a green check at
 * its end. Only a signed-in reader with a verified email has stats,
 * so the item of any other reader stays a plain link.
 */
function DailyPuzzleItem({ user }: { user?: User }) {
	const today = useToday()

	const seed = today ? dailySeed(today) : ''

	const { data } = useStats(seed, today !== null && user?.is_verified === true)

	if (!today) return null

	const played = data !== undefined && data.solo.dailyScore !== null

	return (
		<MenuItem href={`/${seed}`}>
			<Icon icon={<CalendarDays />} />
			<MenuLabel>Daily puzzle</MenuLabel>
			{played && (
				<Icon
					icon={<CircleCheck />}
					label="Played"
					className="ms-auto text-green-600 dark:text-green-500"
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
 * The menu at the right of the header. Home starts the run of a new seed, and
 * Daily puzzle opens the run of the seed of today, which each reader gets on the
 * same date, and shows a check once its first run counts. Vs CPU starts the run of a new seed against the CPU, and Stats
 * opens the stats of the reader. Under them, a reader with no session gets
 * Sign in, and a signed-in reader gets Verify email (until the email is
 * verified) and Sign out.
 */
export function NumbersMenu({ user }: NumbersMenuProps) {
	const [statsOpen, setStatsOpen] = useState(false)

	return (
		<>
			<Menu placement="bottom-end">
				<MenuTrigger>
					<Button variant="plain" aria-label="Menu">
						<Icon icon={<MenuIcon />} />
					</Button>
				</MenuTrigger>

				<MenuContent aria-label="Menu">
					<MenuItem href="/">
						<Icon icon={<House />} />
						<MenuLabel>Home</MenuLabel>
					</MenuItem>

					<DailyPuzzleItem user={user} />

					<MenuItem href={`/${VS_SEGMENT}`}>
						<Icon icon={<Bot />} />
						<MenuLabel>Vs CPU</MenuLabel>
					</MenuItem>

					<MenuItem onAction={() => setStatsOpen(true)}>
						<Icon icon={<ChartColumn />} />
						<MenuLabel>Stats</MenuLabel>
					</MenuItem>

					<MenuSeparator />

					{user ? (
						<>
							<VerifyEmailMenuItem user={user} />

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

			<StatsDialog open={statsOpen} onOpenChange={setStatsOpen} user={user} />
		</>
	)
}
