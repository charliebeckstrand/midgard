import { describe, expect, it } from 'vitest'
import { type DayColumn, resolveMove } from '../../utilities/plan-move'

/** One card, named for the recipe it carries so a case reads as what it is. */
function card(id: string): { id: string; recipeId: string } {
	return { id, recipeId: `recipe:${id}` }
}

/** A board from a plain map of day to card ids. */
function board(days: Record<string, string[]>): DayColumn[] {
	return Object.entries(days).map(([day, ids]) => ({ id: day, items: ids.map(card) }))
}

/** What a result says, in the same shape a case states its expectation. */
function shape(days: ReturnType<typeof resolveMove>): Record<string, string[]> {
	return Object.fromEntries(
		days.map((day) => [day.day, day.entries.map((entry) => entry.id ?? '?')]),
	)
}

const MON = '2026-08-17'
const TUE = '2026-08-18'
const WED = '2026-08-19'

describe('resolveMove', () => {
	it('answers with nothing where the drop changed nothing', () => {
		const before = board({ [MON]: ['a'], [TUE]: ['b'] })

		expect(resolveMove(before, board({ [MON]: ['a'], [TUE]: ['b'] }))).toEqual([])
	})

	it('writes one day back when a card only moved within it', () => {
		const before = board({ [MON]: ['a', 'b'], [TUE]: [] })

		const after = board({ [MON]: ['b', 'a'], [TUE]: [] })

		expect(shape(resolveMove(before, after))).toEqual({ [MON]: ['b', 'a'] })
	})

	// The slot was empty, so the board's own emission is already the answer.
	it('inserts into an empty day', () => {
		const before = board({ [MON]: ['a'], [TUE]: [] })

		const after = board({ [MON]: [], [TUE]: ['a'] })

		expect(shape(resolveMove(before, after))).toEqual({ [MON]: [], [TUE]: ['a'] })
	})

	it('inserts below an occupied slot rather than trading with it', () => {
		const before = board({ [MON]: ['a'], [TUE]: ['b'] })

		// Dropped under `b`, so the card lands at index 1 and nothing was there.
		const after = board({ [MON]: [], [TUE]: ['b', 'a'] })

		expect(shape(resolveMove(before, after))).toEqual({ [MON]: [], [TUE]: ['b', 'a'] })
	})

	// The move a week wants: two days trading places rather than one growing at
	// the other's expense.
	it('swaps when a card lands on an occupied slot', () => {
		const before = board({ [MON]: ['a'], [TUE]: ['b'] })

		// Dropped onto `b`, so the board put `a` at index 0 and left `b` beside it.
		const after = board({ [MON]: [], [TUE]: ['a', 'b'] })

		expect(shape(resolveMove(before, after))).toEqual({ [MON]: ['b'], [TUE]: ['a'] })
	})

	it('puts the displaced card in the slot the moved one came out of', () => {
		const before = board({ [MON]: ['a', 'b', 'c'], [TUE]: ['x'] })

		// `b` — the middle of Monday — dropped onto `x`.
		const after = board({ [MON]: ['a', 'c'], [TUE]: ['b', 'x'] })

		expect(shape(resolveMove(before, after))).toEqual({
			[MON]: ['a', 'x', 'c'],
			[TUE]: ['b'],
		})
	})

	it('swaps with whichever card holds the slot, not with the first of the day', () => {
		const before = board({ [MON]: ['a'], [TUE]: ['x', 'y'] })

		// Dropped onto `y`, the second of Tuesday.
		const after = board({ [MON]: [], [TUE]: ['x', 'a', 'y'] })

		expect(shape(resolveMove(before, after))).toEqual({ [MON]: ['y'], [TUE]: ['x', 'a'] })
	})

	it('leaves every other day alone', () => {
		const before = board({ [MON]: ['a'], [TUE]: ['b'], [WED]: ['c'] })

		const after = board({ [MON]: [], [TUE]: ['a', 'b'], [WED]: ['c'] })

		expect(Object.keys(shape(resolveMove(before, after)))).toEqual([MON, TUE])
	})

	it('carries each card’s own identity through, so a move is not a delete and an add', () => {
		const before = board({ [MON]: ['a'], [TUE]: ['b'] })

		const after = board({ [MON]: [], [TUE]: ['a', 'b'] })

		const days = resolveMove(before, after)

		for (const day of days) {
			for (const entry of day.entries) expect(entry.id).toBeDefined()
		}
	})

	it('answers with nothing where a day the drop names is not on the board', () => {
		const before = board({ [MON]: ['a'] })

		const after = board({ [MON]: [], [TUE]: ['a'] })

		expect(resolveMove(before, after)).toEqual([])
	})
})
