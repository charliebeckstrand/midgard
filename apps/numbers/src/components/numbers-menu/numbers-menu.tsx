'use client'

import type { User } from 'auth'
import { CalendarDays, House, LogIn, Menu as MenuIcon } from 'lucide-react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Button } from 'ui/button'
import { useToday } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { dailySeed } from '../../utilities/seed'

/**
 * The link to the daily puzzle of today. Today is the date of the reader, which
 * the server cannot know. The link renders only in the open menu, a mount after
 * the hydration, so `useToday` gives the day in the first render, and moves the
 * link to the next day at midnight.
 */
function DailyPuzzleItem() {
	const today = useToday()

	if (!today) return null

	return (
		<MenuItem href={`/${dailySeed(today)}`}>
			<Icon icon={<CalendarDays />} />
			<MenuLabel>Daily puzzle</MenuLabel>
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
 * same date. Under them, a reader with no session gets Sign in, and a signed-in
 * reader gets Verify email (until the email is verified) and Sign out.
 */
export function NumbersMenu({ user }: NumbersMenuProps) {
	return (
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

				<DailyPuzzleItem />

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
	)
}
