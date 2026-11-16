'use client'

import { CalendarDays, House, Menu as MenuIcon } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { dailySeed } from '../../utilities/seed'

/**
 * The link to the daily puzzle of today. Today is the date of the reader, which
 * the server cannot know, so the link renders only in the open menu, after the
 * hydration.
 */
function DailyPuzzleItem() {
	return (
		<MenuItem href={`/${dailySeed(new Date())}`}>
			<Icon icon={<CalendarDays />} />
			<MenuLabel>Daily puzzle</MenuLabel>
		</MenuItem>
	)
}

/**
 * The menu at the right of the header. Home starts the run of a new seed, and
 * Daily puzzle opens the run of the seed of today, which each reader gets on the
 * same date.
 */
export function NumbersMenu() {
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
			</MenuContent>
		</Menu>
	)
}
