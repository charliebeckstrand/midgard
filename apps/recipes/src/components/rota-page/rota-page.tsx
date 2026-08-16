'use client'

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import NextLink from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { NO_COOKS, NO_PLAN, NO_RECIPES } from '../../constants'
import {
	useAddCook,
	useAddPlanEntry,
	useCooks,
	usePlan,
	useRecipeNames,
	useRecipes,
	useRemoveCook,
	useRemovePlanEntry,
	useReplacePlanDays,
} from '../../queries/recipes-queries'
import { dayLabel, today } from '../../utilities/day'
import { rankRecipes } from '../../utilities/recipe-rank'
import { nextWeek, previousWeek, weekDays, weekStart } from '../../utilities/rota-week'
import { AppShell } from '../app-shell'
import { RecipePalette } from '../recipe-palette'
import { type BoardCard, type BoardDay, RotaBoard } from '../rota-board'
import { useRotaLocation } from './use-rota-location'

/** How the week reads in the trail. */
const WEEK: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

/**
 * The board: one week, seven columns, and the palette a day's `+` opens.
 *
 * The week lives in the address, so a reader can send someone the week they are
 * looking at, and the Back button walks back through the weeks they stepped.
 */
export function RotaPage() {
	const { data: recipes = NO_RECIPES } = useRecipes()

	const { data: cooks = NO_COOKS } = useCooks()

	const { data: plan = NO_PLAN } = usePlan()

	const { week, setWeek } = useRotaLocation()

	const addPlanEntry = useAddPlanEntry()

	const removePlanEntry = useRemovePlanEntry()

	const replaceDays = useReplacePlanDays()

	const addCook = useAddCook()

	const removeCook = useRemoveCook()

	// Which day the palette will add to. `null` closes it, which is also what it
	// opens on nothing.
	const [adding, setAdding] = useState<string | null>(null)

	const ranked = useMemo(() => rankRecipes(recipes, cooks), [recipes, cooks])

	const nameOf = useRecipeNames()

	// Which meals have been ticked, by day and recipe, and which cook each tick
	// stands on. A cook carries no plan entry — the log is its own record — so the
	// two are matched on what they have in common, which is the recipe and the
	// day. The id comes back with it so the tick can be taken off again.
	const cooked = useMemo(() => {
		const byMeal = new Map<string, string>()

		// Oldest last, so the id held is the first cook of that meal — the one the
		// tick wrote, rather than a later one the reader added from the recipe.
		for (const cook of cooks) byMeal.set(`${cook.day}:${cook.recipeId}`, cook.id)

		return byMeal
	}, [cooks])

	const days: BoardDay[] = useMemo(() => {
		const byDay = new Map<string, BoardCard[]>()

		for (const entry of plan) {
			const cards = byDay.get(entry.day) ?? []

			cards.push({
				id: entry.id,
				recipeId: entry.recipeId,
				name: nameOf(entry.recipeId),
				cookId: cooked.get(`${entry.day}:${entry.recipeId}`) ?? null,
			})

			byDay.set(entry.day, cards)
		}

		return weekDays(week).map((day) => ({ day, cards: byDay.get(day) ?? [] }))
	}, [plan, week, nameOf, cooked])

	const trail = [
		{ label: 'Rota', href: '/rota', render: <NextLink href="/rota" /> },
		{ label: `Week of ${dayLabel(week, WEEK)}` },
	]

	return (
		<AppShell
			steps={trail}
			actions={
				<Flex gap="xs" align="center">
					<Button
						variant="plain"
						aria-label="The week before"
						onClick={() => setWeek(previousWeek(week))}
						prefix={<Icon icon={<ChevronLeft />} />}
					/>

					<Button variant="plain" onClick={() => setWeek(weekStart(today()))}>
						This week
					</Button>

					<Button
						variant="plain"
						aria-label="The week after"
						onClick={() => setWeek(nextWeek(week))}
						prefix={<Icon icon={<ChevronRight />} />}
					/>

					<Button variant="plain" href="/rota/history" prefix={<Icon icon={<CalendarDays />} />}>
						History
					</Button>
				</Flex>
			}
		>
			{/* The board has nothing to narrow, so the shell draws no second row and
			    the week reaches the top of the body. */}
			<div className="h-full px-6 py-4">
				<RotaBoard
					days={days}
					onMove={(moved) => replaceDays.mutate(moved)}
					onAdd={setAdding}
					onCooked={(card, day) => {
						// The control says it is pressed, so pressing it again takes the
						// cook back rather than recording a second one. The store holds
						// two of the same meal on one day quite happily — that is right
						// for a reader who cooked it twice, and the recipe page is where
						// they say so.
						if (card.cookId === null) addCook.mutate({ recipeId: card.recipeId, day })
						else removeCook.mutate(card.cookId)
					}}
					onRemove={(card) => removePlanEntry.mutate(card.id)}
				/>
			</div>

			<RecipePalette
				open={adding !== null}
				onOpenChange={(next) => {
					if (!next) setAdding(null)
				}}
				recipes={ranked}
				day={adding}
				onPick={(recipe) => {
					if (adding !== null) addPlanEntry.mutate({ day: adding, recipeId: recipe.id })

					setAdding(null)
				}}
			/>
		</AppShell>
	)
}
