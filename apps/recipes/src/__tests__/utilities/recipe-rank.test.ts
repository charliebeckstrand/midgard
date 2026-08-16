import { describe, expect, it } from 'vitest'
import { cookFacts, rankRecipes, sortRecipes } from '../../utilities/recipe-rank'
import { cook, recipe } from '../fixtures'

describe('cookFacts', () => {
	it('answers with nothing over an empty log', () => {
		expect(cookFacts([]).size).toBe(0)
	})

	it('counts every cook of one recipe', () => {
		const facts = cookFacts([
			cook('c1', 'r1', '2026-08-01'),
			cook('c2', 'r1', '2026-08-08'),
			cook('c3', 'r2', '2026-08-02'),
		])

		expect(facts.get('r1')).toEqual({ count: 2, last: '2026-08-08' })
		expect(facts.get('r2')).toEqual({ count: 1, last: '2026-08-02' })
	})

	// The same recipe on the same day twice is two cooks, because the reader is
	// the one who knows whether it was one meal.
	it('counts a repeat on one day twice', () => {
		const facts = cookFacts([cook('c1', 'r1', '2026-08-01'), cook('c2', 'r1', '2026-08-01')])

		expect(facts.get('r1')).toEqual({ count: 2, last: '2026-08-01' })
	})

	// The log arrives newest first from the store, so the fold must not take the
	// first day it sees as the latest.
	it('finds the latest day whatever order the log arrives in', () => {
		const later = cookFacts([cook('c1', 'r1', '2026-08-08'), cook('c2', 'r1', '2026-08-01')])

		const earlier = cookFacts([cook('c1', 'r1', '2026-08-01'), cook('c2', 'r1', '2026-08-08')])

		expect(later.get('r1')?.last).toBe('2026-08-08')
		expect(earlier.get('r1')?.last).toBe('2026-08-08')
	})
})

describe('rankRecipes', () => {
	it('gives a recipe with no cooks a count of nothing and no last day', () => {
		expect(rankRecipes([recipe('r1')], [])).toEqual([
			expect.objectContaining({ id: 'r1', cookCount: 0, lastCookedAt: null }),
		])
	})

	it('joins the log onto each record', () => {
		const ranked = rankRecipes(
			[recipe('r1'), recipe('r2')],
			[cook('c1', 'r1', '2026-08-01'), cook('c2', 'r1', '2026-08-08')],
		)

		expect(ranked[0]).toEqual(expect.objectContaining({ cookCount: 2, lastCookedAt: '2026-08-08' }))
		expect(ranked[1]).toEqual(expect.objectContaining({ cookCount: 0, lastCookedAt: null }))
	})

	it('holds the order it was given', () => {
		const ranked = rankRecipes([recipe('b'), recipe('a')], [])

		expect(ranked.map((one) => one.id)).toEqual(['b', 'a'])
	})

	// A cook of a recipe the list does not hold is not an error — the recipe can
	// have been deleted between the two reads.
	it('ignores a cook of a recipe that is not in the list', () => {
		expect(rankRecipes([recipe('r1')], [cook('c1', 'gone', '2026-08-01')])).toEqual([
			expect.objectContaining({ id: 'r1', cookCount: 0 }),
		])
	})
})

describe('sortRecipes', () => {
	const ranked = () =>
		rankRecipes(
			[recipe('chowder', { order: 2 }), recipe('ash', { order: 0 }), recipe('broth', { order: 1 })],
			[
				cook('c1', 'chowder', '2026-08-01'),
				cook('c2', 'chowder', '2026-08-02'),
				cook('c3', 'broth', '2026-08-09'),
			],
		)

	it('takes the reader’s own order for manual', () => {
		expect(sortRecipes(ranked(), 'manual').map((one) => one.id)).toEqual([
			'ash',
			'broth',
			'chowder',
		])
	})

	it('sorts by name', () => {
		expect(sortRecipes(ranked(), 'name').map((one) => one.id)).toEqual(['ash', 'broth', 'chowder'])
	})

	it('sorts by how often, most first', () => {
		expect(sortRecipes(ranked(), 'most-cooked').map((one) => one.id)).toEqual([
			'chowder',
			'broth',
			'ash',
		])
	})

	it('sorts by how recently, latest first', () => {
		expect(sortRecipes(ranked(), 'recently-cooked').map((one) => one.id)).toEqual([
			'broth',
			'chowder',
			'ash',
		])
	})

	// "Cooked longest ago" and "never cooked" are different answers, and only one
	// of them is a date. Never goes last under both orders that read it.
	it('puts a recipe never cooked last, not first', () => {
		const set = rankRecipes([recipe('never'), recipe('once')], [cook('c1', 'once', '2020-01-01')])

		expect(sortRecipes(set, 'recently-cooked').map((one) => one.id)).toEqual(['once', 'never'])
		expect(sortRecipes(set, 'most-cooked').map((one) => one.id)).toEqual(['once', 'never'])
	})

	// Every order ends on the name, so a tie holds still between reads instead of
	// shuffling under a reader who changed nothing.
	it('breaks a tie on the name under every order', () => {
		const set = rankRecipes([recipe('b', { order: 0 }), recipe('a', { order: 0 })], [])

		for (const sort of ['manual', 'most-cooked', 'recently-cooked'] as const) {
			expect(sortRecipes(set, sort).map((one) => one.id)).toEqual(['a', 'b'])
		}
	})

	it('leaves what it was given alone', () => {
		const set = ranked()

		sortRecipes(set, 'name')

		expect(set.map((one) => one.id)).toEqual(['chowder', 'ash', 'broth'])
	})
})
