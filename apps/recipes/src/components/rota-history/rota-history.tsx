'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import NextLink from 'next/link'
import { useCallback, useMemo } from 'react'
import { Button } from 'ui/button'
import { Calendar } from 'ui/calendar'
import { Dialog, DialogBody, DialogTitle } from 'ui/dialog'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Link } from 'ui/link'
import { Text } from 'ui/text'
import { NO_COOKS, NO_PLAN } from '../../constants'
import { useCooks, usePlan, useRecipeNames } from '../../queries/recipes-queries'
import { dayLabel, fromDay, toDay, today } from '../../utilities/day'
import { addMonths, monthStart, toMonth } from '../../utilities/rota-week'
import { AppShell } from '../app-shell'
import { useRotaLocation } from '../rota-page'

/** How a day reads in the panel's title. */
const LONG_DAY: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

/** One meal on a day: the recipe it names, and whether it happened or is only planned. */
type Meal = {
	key: string
	recipeId: string
	name: string
	cooked: boolean
}

/** Nothing on this calendar is selected; see where it is passed. */
const NOT_SELECTED = () => ({ selected: false })

/**
 * The history: a month at a time, with what was cooked and what is planned under
 * each date.
 *
 * Both are drawn, and they are told apart rather than merged. A cook is what
 * happened and a planned meal is what the reader intends; a calendar that showed
 * one as the other would be the app quietly deciding that a plan is a record.
 */
export function RotaHistory() {
	const { data: cooks = NO_COOKS } = useCooks()

	const { data: plan = NO_PLAN } = usePlan()

	const { month, day, setMonth, setDay } = useRotaLocation()

	const nameOf = useRecipeNames()

	// Every meal by day, cooked first. Built once for the month rather than
	// filtered per cell: a month is 31 cells, and a filter each would walk both
	// lists 31 times.
	const byDay = useMemo(() => {
		const days = new Map<string, Meal[]>()

		const add = (day: string, meal: Meal) => {
			const held = days.get(day) ?? []

			held.push(meal)

			days.set(day, held)
		}

		for (const cook of cooks) {
			add(cook.day, {
				key: `cook:${cook.id}`,
				recipeId: cook.recipeId,
				name: nameOf(cook.recipeId),
				cooked: true,
			})
		}

		for (const entry of plan) {
			// A planned meal that was ticked is already on the day as a cook, and
			// drawing both would count one dinner twice.
			const already = days
				.get(entry.day)
				?.some((meal) => meal.cooked && meal.recipeId === entry.recipeId)

			if (already === true) continue

			add(entry.day, {
				key: `plan:${entry.id}`,
				recipeId: entry.recipeId,
				name: nameOf(entry.recipeId),
				cooked: false,
			})
		}

		return days
	}, [cooks, plan, nameOf])

	// Held, because the calendar hands it to a memoized cell: a fresh renderer per
	// render would re-draw all 42 of them on every arrow key.
	const renderDay = useCallback(
		({ date }: { date: Date }) => {
			const meals = byDay.get(toDay(date)) ?? []

			if (meals.length === 0) return null

			return meals.map((meal) => (
				<Link
					key={meal.key}
					href={`/recipes/${encodeURIComponent(meal.recipeId)}`}
					className={
						meal.cooked ? 'block truncate text-xs' : 'block truncate text-xs italic opacity-60'
					}
				>
					{meal.name}
				</Link>
			))
		},
		[byDay],
	)

	const openDay = day === null ? [] : (byDay.get(day) ?? [])

	const trail = [
		{ label: 'Rota', href: '/rota', render: <NextLink href="/rota" /> },
		{ label: dayLabel(monthStart(month), { month: 'long', year: 'numeric' }) },
	]

	return (
		<AppShell
			steps={trail}
			actions={
				<Flex gap="xs" align="center">
					<Button
						variant="plain"
						aria-label="The month before"
						onClick={() => setMonth(addMonths(month, -1))}
						prefix={<Icon icon={<ChevronLeft />} />}
					/>

					<Button variant="plain" onClick={() => setMonth(toMonth(today()))}>
						This month
					</Button>

					<Button
						variant="plain"
						aria-label="The month after"
						onClick={() => setMonth(addMonths(month, 1))}
						prefix={<Icon icon={<ChevronRight />} />}
					/>

					<Button variant="plain" href="/rota">
						The week
					</Button>
				</Flex>
			}
		>
			<div className="px-6 py-4">
				<Calendar
					// Keyed on the month and seeded rather than bound, because the month
					// is the address's and the selection is nobody's: pressing a date
					// opens that day, and a bound value would leave the 1st of every
					// month reading as picked when all it did was name the month.
					key={month}
					layout="month"
					defaultValue={fromDay(monthStart(month))}
					// Nothing on this calendar is selected. The reader's press opens a
					// panel, and the panel is the answer — a date left filled in behind
					// it would say they had chosen it.
					getDayProps={NOT_SELECTED}
					onValueChange={(picked) => setDay(picked === null ? null : toDay(picked))}
					renderDay={renderDay}
				/>
			</div>

			<Dialog
				open={day !== null}
				onOpenChange={(next) => {
					if (!next) setDay(null)
				}}
			>
				<DialogTitle>{day === null ? '' : dayLabel(day, LONG_DAY)}</DialogTitle>

				<DialogBody>
					{openDay.length === 0 ? (
						<Text>Nothing on this day.</Text>
					) : (
						<Flex direction="col" gap="sm">
							{openDay.map((meal) => (
								<Flex key={meal.key} justify="between" align="center" gap="sm">
									<Link href={`/recipes/${encodeURIComponent(meal.recipeId)}`}>{meal.name}</Link>

									<Text className="shrink-0 text-sm opacity-60">
										{meal.cooked ? 'Cooked' : 'Planned'}
									</Text>
								</Flex>
							))}
						</Flex>
					)}
				</DialogBody>
			</Dialog>
		</AppShell>
	)
}
