'use client'

import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Icon } from 'ui/icon'
import { Text } from 'ui/text'
import {
	useAddRecipe,
	useCooks,
	useDeleteRecipe,
	useRecipes,
	useReorderRecipes,
	useSaveRecipe,
	useSetFavorite,
} from '../../queries/recipes-queries'
import type { CookEvent, RankedRecipe, Recipe } from '../../types'
import { rankRecipes, sortRecipes } from '../../utilities/recipe-rank'
import { filterRecipes } from '../../utilities/recipes-filter'
import { AppShell } from '../app-shell'
import { RecipeFilters } from '../recipe-filters'
import { RecipeFormDrawer } from '../recipe-form-drawer'
import { RecipeList } from '../recipe-list'
import { useRecipesLocation } from './use-recipes-location'

/** The empty list a pending query stands in for, held so its identity is stable. */
const NO_RECIPES: Recipe[] = []

/** The same, for the cook log. */
const NO_COOKS: CookEvent[] = []

/** The trail of a page that is the top of its own section. */
const TRAIL = [{ label: 'Recipes' }]

/**
 * The list: every recipe, in the order and the narrowing the address states.
 *
 * It owns the two drawers and the confirmation, because each of them stands over
 * the list rather than over any row in it — and the row that opened one can be
 * filtered away while it is open.
 */
export function RecipesPage() {
	const { data: recipes = NO_RECIPES, isPending, error } = useRecipes()

	const { data: cooks = NO_COOKS } = useCooks()

	const { filter, sort, setFilter, setSort } = useRecipesLocation()

	const addRecipe = useAddRecipe()

	const saveRecipe = useSaveRecipe()

	const deleteRecipe = useDeleteRecipe()

	const setFavorite = useSetFavorite()

	const reorder = useReorderRecipes()

	const [adding, setAdding] = useState(false)

	// The recipe the form is editing, and the one the confirmation stands over.
	// Both are `null` for "no such panel", which is also what opens the form on a
	// new recipe.
	const [editing, setEditing] = useState<Recipe | null>(null)

	const [deleting, setDeleting] = useState<RankedRecipe | null>(null)

	// What the log says about each recipe. Its own memo because the fold walks the
	// whole log, and this component re-renders on every keystroke in the search
	// box.
	const ranked = useMemo(() => rankRecipes(recipes, cooks), [recipes, cooks])

	// Narrowed first, then ordered. The other way round orders rows the bar is
	// about to drop, which is work for nothing on every keystroke.
	const shown = useMemo(
		() => sortRecipes(filterRecipes(ranked, filter), sort),
		[ranked, filter, sort],
	)

	return (
		<AppShell
			steps={TRAIL}
			actions={
				<Button color="green" prefix={<Icon icon={<Plus />} />} onClick={() => setAdding(true)}>
					Add recipe
				</Button>
			}
			// Only once there is a list to narrow. A bar over an empty store offers
			// to filter nothing, one step further from the button that fixes it.
			filters={
				recipes.length > 0 ? (
					<RecipeFilters
						value={filter}
						onValueChange={setFilter}
						sort={sort}
						onSortChange={setSort}
					/>
				) : undefined
			}
		>
			<div className="px-6 py-4">
				{error ? (
					<Alert severity="error" className="mb-4">
						<Text>{error.message}</Text>
					</Alert>
				) : null}

				{!isPending && recipes.length === 0 ? (
					<div className="py-16 text-center">
						<Text>No recipes yet. Add one and it lands here.</Text>
					</div>
				) : (
					<RecipeList
						recipes={shown}
						sort={sort}
						onReorder={(ids) => reorder.mutate(ids)}
						onFavorite={(recipe, favorite) => setFavorite.mutate({ id: recipe.id, favorite })}
						onEdit={setEditing}
						onDelete={setDeleting}
					/>
				)}
			</div>

			{/* One drawer for both writes, opened on a recipe to edit it and on nothing
			    to add one. Two would be the same ten fields twice. */}
			<RecipeFormDrawer
				open={adding || editing !== null}
				onOpenChange={(next) => {
					setAdding(next)

					if (!next) setEditing(null)
				}}
				recipe={editing}
				onSubmit={(draft) =>
					editing === null
						? addRecipe.mutateAsync(draft)
						: saveRecipe.mutateAsync({ id: editing.id, draft })
				}
			/>

			{/* A delete is the one action here the reader cannot undo — the store keeps
			    no history — so it is the one that asks first. It names what else goes
			    with it, because a recipe is not the only record that names it. */}
			<Confirm
				open={deleting !== null}
				onOpenChange={(next) => {
					if (!next) setDeleting(null)
				}}
				onConfirm={() => {
					if (deleting !== null) void deleteRecipe.mutateAsync(deleting.id)

					setDeleting(null)
				}}
				title={deleting === null ? '' : `Delete "${deleting.name}"?`}
				description={
					deleting === null
						? undefined
						: deleting.cookCount === 0
							? 'This cannot be undone.'
							: `Its ${deleting.cookCount} cooks and any planned meals go with it. This cannot be undone.`
				}
				confirm={{ label: 'Delete', color: 'red' }}
			/>
		</AppShell>
	)
}
