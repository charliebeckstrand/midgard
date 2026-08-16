'use client'

import { useMemo } from 'react'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
	useCommandPaletteQuery,
} from 'ui/command-palette'
import { WANT_TO_TRY } from '../../constants'
import type { RankedRecipe } from '../../types'
import { dayLabel } from '../../utilities/day'
import { sortRecipes } from '../../utilities/recipe-rank'

/** Props for {@link RecipePalette}. */
export type RecipePaletteProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	recipes: readonly RankedRecipe[]
	/** The day the pick lands on, which is what the palette names itself for. */
	day: string | null
	onPick: (recipe: RankedRecipe) => void
}

/** How a day reads in the palette's placeholder. */
const DAY: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

/** How many a section shows before the reader is better served by searching. */
const SECTION_LIMIT = 5

/** One recipe's second line: what the log says about it. */
function summary(recipe: RankedRecipe): string {
	if (recipe.cookCount === 0) return 'Never cooked'

	return recipe.cookCount === 1 ? 'Cooked once' : `Cooked ${recipe.cookCount} times`
}

/** The sections, and the recipes each of them holds. @internal */
function useSections(recipes: readonly RankedRecipe[], query: string) {
	return useMemo(() => {
		const text = query.trim().toLowerCase()

		const matching = recipes.filter((recipe) => recipe.name.toLowerCase().includes(text))

		// While the reader is searching there is one answer and it is the matches.
		// Sections would put the thing they typed the name of below two headings.
		if (text !== '') {
			return [{ title: 'Matches', recipes: sortRecipes(matching, 'name') }]
		}

		const cooked = sortRecipes(matching, 'most-cooked').filter((recipe) => recipe.cookCount > 0)

		const wanted = matching.filter((recipe) => recipe.labels.includes(WANT_TO_TRY))

		const shown = new Set([
			...cooked.slice(0, SECTION_LIMIT).map((recipe) => recipe.id),
			...wanted.slice(0, SECTION_LIMIT).map((recipe) => recipe.id),
		])

		return [
			{ title: 'Most cooked', recipes: cooked.slice(0, SECTION_LIMIT) },
			{ title: 'Want to try', recipes: wanted.slice(0, SECTION_LIMIT) },
			{
				title: 'Everything else',
				recipes: sortRecipes(
					matching.filter((recipe) => !shown.has(recipe.id)),
					'name',
				),
			},
		].filter((section) => section.recipes.length > 0)
	}, [recipes, query])
}

/** The palette's own body, which needs to be inside it to read the query. @internal */
function PaletteBody({
	recipes,
	onPick,
}: {
	recipes: readonly RankedRecipe[]
	onPick: (recipe: RankedRecipe) => void
}) {
	// The deferred query rather than the live one, so a long list does not make
	// the typing itself lag.
	const { deferredQuery } = useCommandPaletteQuery()

	const sections = useSections(recipes, deferredQuery)

	return (
		<>
			{sections.map((section) => (
				<CommandPaletteGroup key={section.title} title={section.title}>
					{section.recipes.map((recipe) => (
						<CommandPaletteItem key={recipe.id} onAction={() => onPick(recipe)}>
							<CommandPaletteLabel>{recipe.name}</CommandPaletteLabel>

							<CommandPaletteDescription>{summary(recipe)}</CommandPaletteDescription>
						</CommandPaletteItem>
					))}
				</CommandPaletteGroup>
			))}
		</>
	)
}

/**
 * The palette a day's `+` opens: every recipe, ordered by what the reader
 * actually cooks.
 *
 * The sections are the reason it is a palette rather than a list. An unsearched
 * palette leads with what this household cooks most, then what they have said
 * they want to try, because those are the two answers to "what's for dinner"
 * that a name-ordered list buries. Once they type, the sections collapse to one:
 * they know what they are looking for, and headings would put it below two of
 * them.
 */
export function RecipePalette({ open, onOpenChange, recipes, day, onPick }: RecipePaletteProps) {
	return (
		<CommandPalette
			open={open}
			onOpenChange={onOpenChange}
			placeholder={day === null ? 'Add a meal' : `Add a meal to ${dayLabel(day, DAY)}`}
			// The board owns the shortcut it opens under, and a palette bound to
			// ⌘K would also open with no day to add to.
			triggerShortcut={false}
		>
			<PaletteBody recipes={recipes} onPick={onPick} />
		</CommandPalette>
	)
}
