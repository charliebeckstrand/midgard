'use client'

import { Bot, CalendarDays, House, Menu as MenuIcon } from 'lucide-react'
import { Button } from 'ui/button'
import { useToday } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { dailySeed, VS_SEGMENT } from '../../utilities/seed'

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

/**
 * The menu at the right of the header. Home starts the run of a new seed, and
 * Daily puzzle opens the run of the seed of today, which each reader gets on the
 * same date. Vs CPU starts the run of a new seed against the CPU.
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

				<MenuItem href={`/${VS_SEGMENT}`}>
					<Icon icon={<Bot />} />
					<MenuLabel>Vs CPU</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
