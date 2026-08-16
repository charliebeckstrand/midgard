'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
	createCook,
	createPlanEntry,
	createRecipe,
	deleteCook,
	deletePlanEntry,
	deleteRecipe,
	fetchCooks,
	fetchPlan,
	fetchRecipes,
	reorderRecipes,
	replacePlanDays,
	saveRecipe,
	setRecipeFavorite,
} from '../api/recipes-api'
import { MISSING_RECIPE, NO_RECIPES } from '../constants'
import type { CookDraft, CookEvent, DayEntries, PlanEntry, Recipe, RecipeDraft } from '../types'

/**
 * The query keys, in one place. Both a reader and a writer name each entry, and
 * an invalidation that spelled a key a second way would refresh nothing.
 */
export const recipeKeys = {
	recipes: ['recipes'] as const,
	cooks: ['cooks'] as const,
	plan: ['plan'] as const,
}

/** Every stored recipe, in the reader's own order. */
export function useRecipes() {
	return useQuery({
		queryKey: recipeKeys.recipes,
		queryFn: ({ signal }) => fetchRecipes(signal),
	})
}

/**
 * The whole cook log.
 *
 * Its own query rather than a field on the recipes, because it is its own
 * record: a cook of a recipe that has since been edited still happened, and
 * every count the list sorts by is a fold over this — see `recipe-rank.ts`.
 */
export function useCooks() {
	return useQuery({
		queryKey: recipeKeys.cooks,
		queryFn: ({ signal }) => fetchCooks(signal),
	})
}

/** Every planned meal. */
export function usePlan() {
	return useQuery({
		queryKey: recipeKeys.plan,
		queryFn: ({ signal }) => fetchPlan(signal),
	})
}

/**
 * Every recipe's name by id, with the stand-in for one that is gone baked in.
 *
 * A selector rather than a map built per page: both Rota surfaces want exactly
 * this, and a second copy is a second place to decide what a missing recipe
 * reads as.
 */
export function useRecipeNames(): (id: string) => string {
	const { data: recipes = NO_RECIPES } = useRecipes()

	const names = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe.name])), [recipes])

	return useCallback((id: string) => names.get(id) ?? MISSING_RECIPE, [names])
}

/**
 * The snapshot-and-roll-back half of an optimistic write over the recipe list.
 *
 * Both writes that answer before the store does need the same three steps, and
 * the rollback is the half a third one would forget: cancel anything in flight,
 * keep what was there, and put it back if the request fails.
 */
function optimisticRecipes<Variables>(
	client: ReturnType<typeof useQueryClient>,
	patch: (held: Recipe[], variables: Variables) => Recipe[],
) {
	return {
		onMutate: async (variables: Variables) => {
			await client.cancelQueries({ queryKey: recipeKeys.recipes })

			const held = client.getQueryData<Recipe[]>(recipeKeys.recipes)

			client.setQueryData<Recipe[]>(recipeKeys.recipes, (current = []) => patch(current, variables))

			return { held }
		},
		onError: (_error: unknown, _variables: Variables, context: { held?: Recipe[] } | undefined) => {
			if (context?.held !== undefined) {
				client.setQueryData<Recipe[]>(recipeKeys.recipes, context.held)
			}
		},
	}
}

/**
 * Adds a recipe and puts it straight into the cached list, so it is in the list
 * by the time the drawer closes.
 *
 * No refetch behind it: the route answers with the stored record, so the cache
 * already holds what a re-read would return. It lands at the end, which is where
 * the store put it.
 */
export function useAddRecipe() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (draft: RecipeDraft) => createRecipe(draft),
		onSuccess: (recipe) => {
			client.setQueryData<Recipe[]>(recipeKeys.recipes, (held = []) => [...held, recipe])
		},
	})
}

/** Replaces one recipe, in the store and then in the cached list. */
export function useSaveRecipe() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ id, draft }: { id: string; draft: RecipeDraft }) => saveRecipe(id, draft),
		onSuccess: (recipe) => {
			client.setQueryData<Recipe[]>(recipeKeys.recipes, (held = []) =>
				held.map((one) => (one.id === recipe.id ? recipe : one)),
			)
		},
	})
}

/**
 * Marks a recipe a favourite, or takes the mark off.
 *
 * Written into the cache before the request, because the heart is a control
 * whose whole job is to answer instantly — and put back the way it was if the
 * write fails, so the list never keeps a mark the store refused.
 */
export function useSetFavorite() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
			setRecipeFavorite(id, favorite),
		...optimisticRecipes(client, (held, { id, favorite }: { id: string; favorite: boolean }) =>
			held.map((one) => (one.id === id ? { ...one, favorite } : one)),
		),
		onSuccess: (recipe) => {
			client.setQueryData<Recipe[]>(recipeKeys.recipes, (held = []) =>
				held.map((one) => (one.id === recipe.id ? recipe : one)),
			)
		},
	})
}

/**
 * Writes the reader's order.
 *
 * Optimistic for the reason the favourite is, and more so: the list has already
 * moved under the reader's hand, and a card that sprang back while the write
 * landed would read as a drop that failed.
 */
export function useReorderRecipes() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (ids: readonly string[]) => reorderRecipes(ids),
		...optimisticRecipes(client, (held, ids: readonly string[]) => {
			const rank = new Map(ids.map((id, at) => [id, at]))

			return [...held].sort(
				(a, b) =>
					(rank.get(a.id) ?? Number.POSITIVE_INFINITY) -
					(rank.get(b.id) ?? Number.POSITIVE_INFINITY),
			)
		}),
		onSuccess: (recipes) => {
			client.setQueryData<Recipe[]>(recipeKeys.recipes, recipes)
		},
	})
}

/**
 * Removes a recipe, and with it every cook and planned meal that named it.
 *
 * The route clears all three files, so all three cached lists are cleaned here.
 * A cook pointing at a recipe that is gone is not a record — it is a row the
 * calendar would draw as a blank.
 */
export function useDeleteRecipe() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => deleteRecipe(id),
		onSuccess: (_result, id) => {
			client.setQueryData<Recipe[]>(recipeKeys.recipes, (held = []) =>
				held.filter((one) => one.id !== id),
			)

			client.setQueryData<CookEvent[]>(recipeKeys.cooks, (held = []) =>
				held.filter((one) => one.recipeId !== id),
			)

			client.setQueryData<PlanEntry[]>(recipeKeys.plan, (held = []) =>
				held.filter((one) => one.recipeId !== id),
			)
		},
	})
}

/** Records one cook, and puts it at the head of the cached log. */
export function useAddCook() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (draft: CookDraft) => createCook(draft),
		onSuccess: (cook) => {
			client.setQueryData<CookEvent[]>(recipeKeys.cooks, (held = []) => [cook, ...held])
		},
	})
}

/** Takes one cook back off the log. */
export function useRemoveCook() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => deleteCook(id),
		onSuccess: (_result, id) => {
			client.setQueryData<CookEvent[]>(recipeKeys.cooks, (held = []) =>
				held.filter((one) => one.id !== id),
			)
		},
	})
}

/** Plans one meal, at the end of its day. */
export function useAddPlanEntry() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (draft: { day: string; recipeId: string }) => createPlanEntry(draft),
		onSuccess: (entry) => {
			client.setQueryData<PlanEntry[]>(recipeKeys.plan, (held = []) => [...held, entry])
		},
	})
}

/**
 * Restates whole days, which is how every board move lands.
 *
 * The route answers with the whole plan, so the cache takes what the store
 * settled on rather than a copy patched here — which is what makes a swap land
 * as one state and not two.
 */
export function useReplacePlanDays() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (days: readonly DayEntries[]) => replacePlanDays(days),
		onSuccess: (plan) => {
			client.setQueryData<PlanEntry[]>(recipeKeys.plan, plan)
		},
	})
}

/** Takes one meal off the plan. */
export function useRemovePlanEntry() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => deletePlanEntry(id),
		onSuccess: (_result, id) => {
			client.setQueryData<PlanEntry[]>(recipeKeys.plan, (held = []) =>
				held.filter((one) => one.id !== id),
			)
		},
	})
}
