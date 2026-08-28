import { describe, expect, it } from 'vitest'
import { rankRecipes } from '../../utilities/recipe-rank'
import { filterRecipes, hasActiveFilter } from '../../utilities/recipes-filter'
import { recipe } from '../fixtures'

const SET = rankRecipes(
	[
		recipe('chowder', {
			name: 'Clam chowder',
			description: 'Thick and white',
			labels: ['comfort'],
			ingredients: [{ item: 'clams' }, { item: 'potatoes' }],
		}),
		recipe('dal', {
			name: 'Red dal',
			labels: ['quick', 'vegetarian'],
			favorite: true,
			ingredients: [{ item: 'red lentils' }],
		}),
		recipe('roast', { name: 'Sunday roast', labels: [], ingredients: [{ item: 'potatoes' }] }),
	],
	[],
)

describe('hasActiveFilter', () => {
	it('reads an empty bar as narrowing nothing', () => {
		expect(hasActiveFilter({})).toBe(false)
	})

	// `Filters` leaves a cleared slot present and `undefined`, so counting keys
	// would raise the Clear over a field the reader has already emptied.
	it('reads a cleared field as narrowing nothing', () => {
		expect(hasActiveFilter({ labels: undefined, search: undefined })).toBe(false)

		expect(hasActiveFilter({ labels: [] })).toBe(false)

		expect(hasActiveFilter({ search: '   ' })).toBe(false)
	})

	it('reads a set field as narrowing something', () => {
		expect(hasActiveFilter({ search: 'dal' })).toBe(true)

		expect(hasActiveFilter({ labels: ['quick'] })).toBe(true)

		expect(hasActiveFilter({ favorite: true })).toBe(true)
	})
})

describe('filterRecipes', () => {
	it('admits everything under an empty bar', () => {
		expect(filterRecipes(SET, {})).toHaveLength(3)
	})

	it('holds the order it was given', () => {
		expect(filterRecipes(SET, {}).map((one) => one.id)).toEqual(['chowder', 'dal', 'roast'])
	})

	it('narrows to favourites', () => {
		expect(filterRecipes(SET, { favorite: true }).map((one) => one.id)).toEqual(['dal'])
	})

	// The labels are facets of one dish and not a path through a tree, so picking
	// two asks for either — asking for both would usually answer with nothing.
	it('admits a recipe carrying any of the picked labels', () => {
		expect(filterRecipes(SET, { labels: ['quick', 'comfort'] }).map((one) => one.id)).toEqual([
			'chowder',
			'dal',
		])
	})

	it('admits nothing under an empty label list', () => {
		expect(filterRecipes(SET, { labels: [] })).toHaveLength(0)
	})

	it('searches the name', () => {
		expect(filterRecipes(SET, { search: 'chowder' }).map((one) => one.id)).toEqual(['chowder'])
	})

	it('searches the description', () => {
		expect(filterRecipes(SET, { search: 'thick' }).map((one) => one.id)).toEqual(['chowder'])
	})

	// The search a cook actually runs: they have a bag of lentils, not a dish in
	// mind.
	it('searches the ingredients', () => {
		expect(filterRecipes(SET, { search: 'lentils' }).map((one) => one.id)).toEqual(['dal'])
	})

	it('ignores case and surrounding space', () => {
		expect(filterRecipes(SET, { search: '  POTATOES ' }).map((one) => one.id)).toEqual([
			'chowder',
			'roast',
		])
	})

	it('narrows on every field at once', () => {
		expect(
			filterRecipes(SET, { search: 'potatoes', labels: ['comfort'] }).map((one) => one.id),
		).toEqual(['chowder'])
	})
})
