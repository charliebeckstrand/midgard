'use client'

import { Heart, Pencil, Trash2 } from 'lucide-react'
import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { LABEL_BY_VALUE, labelName } from '../../constants'
import type { RankedRecipe, RecipeSort } from '../../types'
import { dayLabel } from '../../utilities/day'

/** Props for {@link RecipeList}. */
export type RecipeListProps = {
	recipes: readonly RankedRecipe[]
	/**
	 * The order the list is in, which decides whether a drag is offered.
	 *
	 * See the note on the drag below: only the reader's own order is one a drag
	 * can write to.
	 */
	sort: RecipeSort
	/** Fires with the new order, ids first to last. */
	onReorder: (ids: string[]) => void
	onFavorite: (recipe: RankedRecipe, favorite: boolean) => void
	onEdit: (recipe: RankedRecipe) => void
	onDelete: (recipe: RankedRecipe) => void
}

/** How a day reads on a row, where the year matters and the weekday does not. */
const SHORT_DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

/** What a recipe's second line says: how often it has been cooked, and when last. */
function summary(recipe: RankedRecipe): string {
	if (recipe.cookCount === 0) return 'Never cooked'

	const times = recipe.cookCount === 1 ? 'Cooked once' : `Cooked ${recipe.cookCount} times`

	return recipe.lastCookedAt === null
		? times
		: `${times} · last on ${dayLabel(recipe.lastCookedAt, SHORT_DAY)}`
}

/**
 * The recipes, as rows.
 *
 * The drag is offered only in the reader's own order. Every other order is a
 * measurement of the record or the cook log — by name, by how often, by how
 * recently — and a drag cannot write to a measurement: the card would spring
 * back to where the numbers put it, which reads as a drop that failed. So the
 * handles are simply absent under those orders, rather than present and inert.
 */
export function RecipeList({
	recipes,
	sort,
	onReorder,
	onFavorite,
	onEdit,
	onDelete,
}: RecipeListProps) {
	const draggable = sort === 'manual'

	const row = (recipe: RankedRecipe) => (
		<ListItem
			key={recipe.id}
			href={`/recipes/${encodeURIComponent(recipe.id)}`}
			suffix={
				// The row is a link, so every control in this slot stops the click from
				// reaching it — a heart that also opened the recipe would be a control
				// the reader could not press without leaving the page they pressed it on.
				<Flex gap="xs" align="center" onClick={(event) => event.preventDefault()}>
					<Tooltip>
						<TooltipTrigger>
							<ToggleIconButton
								icon={
									<Icon icon={<Heart />} className={recipe.favorite ? 'fill-current' : undefined} />
								}
								color={recipe.favorite ? 'red' : undefined}
								aria-label={recipe.favorite ? 'Remove from favourites' : 'Add to favourites'}
								aria-pressed={recipe.favorite}
								onClick={() => onFavorite(recipe, !recipe.favorite)}
							/>
						</TooltipTrigger>

						<TooltipContent>{recipe.favorite ? 'Favourite' : 'Add to favourites'}</TooltipContent>
					</Tooltip>

					<ToggleIconButton
						icon={<Icon icon={<Pencil />} />}
						aria-label={`Edit ${recipe.name}`}
						onClick={() => onEdit(recipe)}
					/>

					<ToggleIconButton
						icon={<Icon icon={<Trash2 />} />}
						color="red"
						aria-label={`Delete ${recipe.name}`}
						onClick={() => onDelete(recipe)}
					/>
				</Flex>
			}
		>
			<Flex direction="col" gap="xs" className="min-w-0">
				<Flex gap="sm" align="center" className="min-w-0">
					<ListLabel className="truncate">{recipe.name}</ListLabel>

					{recipe.labels.map((label) => (
						<Badge key={label} color={LABEL_BY_VALUE.get(label)?.color} className="shrink-0">
							{labelName(label)}
						</Badge>
					))}
				</Flex>

				<ListDescription className="truncate">
					{recipe.description ?? summary(recipe)}
				</ListDescription>
			</Flex>
		</ListItem>
	)

	if (recipes.length === 0) {
		return (
			<Flex direction="col" align="center" justify="center" gap="sm" className="py-16">
				<Text>Nothing here yet.</Text>
			</Flex>
		)
	}

	// The two arms are written apart because the surface is a union: a
	// reorderable list takes the sink, and a read-only one must not be handed one
	// it would never call.
	return draggable ? (
		<List<RankedRecipe>
			aria-label="Recipes"
			items={[...recipes]}
			getKey={(recipe) => recipe.id}
			onReorder={(next) => onReorder(next.map((recipe) => recipe.id))}
		>
			{row}
		</List>
	) : (
		<List<RankedRecipe>
			aria-label="Recipes"
			sortable={false}
			items={[...recipes]}
			getKey={(recipe) => recipe.id}
		>
			{row}
		</List>
	)
}
