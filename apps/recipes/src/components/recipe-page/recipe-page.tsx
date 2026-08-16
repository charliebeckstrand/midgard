'use client'

import { CookingPot, Heart, Pencil, Trash2 } from 'lucide-react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Divider } from 'ui/divider'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Link } from 'ui/link'
import { Text } from 'ui/text'
import { LABEL_BY_VALUE, labelName } from '../../constants'
import {
	useAddCook,
	useCooks,
	useDeleteRecipe,
	useRecipes,
	useSaveRecipe,
	useSetFavorite,
} from '../../queries/recipes-queries'
import type { CookEvent, Recipe } from '../../types'
import { dayLabel, today } from '../../utilities/day'
import { formatIngredient } from '../../utilities/ingredient-line'
import { AppShell } from '../app-shell'
import { RecipeFormDrawer } from '../recipe-form-drawer'

/** Props for {@link RecipePage}. */
export type RecipePageProps = {
	id: string
}

/** The empty lists the pending queries stand in for, held so their identities are stable. */
const NO_RECIPES: Recipe[] = []

const NO_COOKS: CookEvent[] = []

/** How a day reads in this page's own prose. */
const LONG_DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }

/** The two times, as one line, leaving out whichever the recipe does not carry. */
function timing(recipe: Recipe): string | null {
	const parts = [
		recipe.prepMinutes === undefined ? null : `${recipe.prepMinutes} min prep`,
		recipe.cookMinutes === undefined ? null : `${recipe.cookMinutes} min cook`,
	].filter((part): part is string => part !== null)

	return parts.length === 0 ? null : parts.join(' · ')
}

/**
 * One recipe, whole.
 *
 * It reads the recipe out of the list rather than fetching one of its own. The
 * list is already in the cache on every route into this page, one more request
 * would answer with a record the cache already holds, and reading through the
 * live list is what lets an edit reach this page and a delete leave it.
 */
export function RecipePage({ id }: RecipePageProps) {
	const router = useRouter()

	const { data: recipes = NO_RECIPES, isPending } = useRecipes()

	const { data: cooks = NO_COOKS } = useCooks()

	const saveRecipe = useSaveRecipe()

	const deleteRecipe = useDeleteRecipe()

	const setFavorite = useSetFavorite()

	const addCook = useAddCook()

	const [editing, setEditing] = useState(false)

	const [deleting, setDeleting] = useState(false)

	const recipe = recipes.find((one) => one.id === id) ?? null

	// This recipe's own cooks, newest first — which is the order the log arrives
	// in, so the filter is the whole of the work.
	const history = useMemo(() => cooks.filter((cook) => cook.recipeId === id), [cooks, id])

	const steps = [
		{ label: 'Recipes', href: '/', render: <NextLink href="/" /> },
		{ label: recipe?.name ?? 'Recipe' },
	]

	if (recipe === null) {
		return (
			<AppShell steps={steps}>
				<div className="px-6 py-16 text-center">
					<Text>{isPending ? 'Finding it…' : 'No recipe with that address.'}</Text>
				</div>
			</AppShell>
		)
	}

	const times = timing(recipe)

	return (
		<AppShell
			steps={steps}
			// A detail page has nothing to narrow, so its actions take the row the
			// filters would have had — which is where a reader who came from the list
			// has just been looking.
			filters={
				<Flex gap="sm" align="center" className="px-6 py-3">
					<Button
						variant="plain"
						prefix={<Icon icon={<Pencil />} />}
						onClick={() => setEditing(true)}
					>
						Edit
					</Button>

					<Button
						variant={recipe.favorite ? 'soft' : 'plain'}
						color={recipe.favorite ? 'red' : undefined}
						prefix={
							<Icon icon={<Heart />} className={recipe.favorite ? 'fill-current' : undefined} />
						}
						aria-pressed={recipe.favorite}
						onClick={() => setFavorite.mutate({ id: recipe.id, favorite: !recipe.favorite })}
					>
						{recipe.favorite ? 'Favourite' : 'Add to favourites'}
					</Button>

					{/* The one control on this page that writes fact rather than intent.
					    Nothing else creates a cook — see the app README. */}
					<Button
						variant="plain"
						prefix={<Icon icon={<CookingPot />} />}
						onClick={() => addCook.mutate({ recipeId: recipe.id, day: today() })}
					>
						Cooked today
					</Button>

					<Button
						variant="plain"
						color="red"
						prefix={<Icon icon={<Trash2 />} />}
						onClick={() => setDeleting(true)}
					>
						Delete
					</Button>
				</Flex>
			}
		>
			<div className="mx-auto max-w-3xl px-6 py-8">
				<Flex direction="col" gap="md">
					{recipe.description ? <Text>{recipe.description}</Text> : null}

					<Flex gap="sm" align="center" wrap>
						<Badge color="zinc">Serves {recipe.servings}</Badge>

						{times === null ? null : <Badge color="zinc">{times}</Badge>}

						{recipe.labels.map((label) => (
							<Badge key={label} color={LABEL_BY_VALUE.get(label)?.color}>
								{labelName(label)}
							</Badge>
						))}
					</Flex>

					{recipe.sourceUrl ? (
						<Text>
							<Link href={recipe.sourceUrl} target="_blank" rel="noreferrer">
								Source
							</Link>
						</Text>
					) : null}
				</Flex>

				<Divider className="my-8" />

				<div className="grid grid-cols-1 gap-8 sm:grid-cols-[1fr_2fr]">
					<section>
						<Heading level={2} className="mb-3">
							Ingredients
						</Heading>

						<ul className="flex flex-col gap-1">
							{recipe.ingredients.map((line) => (
								<li key={formatIngredient(line)}>
									<Text>{formatIngredient(line)}</Text>
								</li>
							))}
						</ul>
					</section>

					<section>
						<Heading level={2} className="mb-3">
							Method
						</Heading>

						{recipe.steps.length === 0 ? (
							<Text>No method written down.</Text>
						) : (
							<ol className="flex list-decimal flex-col gap-2 pl-5">
								{recipe.steps.map((step, at) => (
									// The steps are an ordered list of prose with no identity of
									// their own, so the position is the key: two identical steps
									// are two steps.
									// biome-ignore lint/suspicious/noArrayIndexKey: a step's position is its identity
									<li key={at}>
										<Text>{step}</Text>
									</li>
								))}
							</ol>
						)}
					</section>
				</div>

				{recipe.notes ? (
					<>
						<Divider className="my-8" />

						<section>
							<Heading level={2} className="mb-3">
								Notes
							</Heading>

							<Text>{recipe.notes}</Text>
						</section>
					</>
				) : null}

				<Divider className="my-8" />

				<section>
					<Heading level={2} className="mb-3">
						Cooked
					</Heading>

					{history.length === 0 ? (
						<Text>Never, yet.</Text>
					) : (
						<Flex direction="col" gap="xs">
							{history.map((cook) => (
								<Text key={cook.id}>{dayLabel(cook.day, LONG_DAY)}</Text>
							))}
						</Flex>
					)}
				</section>
			</div>

			<RecipeFormDrawer
				open={editing}
				onOpenChange={setEditing}
				recipe={recipe}
				onSubmit={(draft) => saveRecipe.mutateAsync({ id: recipe.id, draft })}
			/>

			<Confirm
				open={deleting}
				onOpenChange={setDeleting}
				onConfirm={async () => {
					await deleteRecipe.mutateAsync(recipe.id)

					setDeleting(false)

					// The page this stands on is the record that just went, so it cannot
					// be where the reader is left.
					router.push('/')
				}}
				title={`Delete "${recipe.name}"?`}
				description={
					history.length === 0
						? 'This cannot be undone.'
						: `Its ${history.length} cooks and any planned meals go with it. This cannot be undone.`
				}
				confirm={{ label: 'Delete', color: 'red' }}
			/>
		</AppShell>
	)
}
