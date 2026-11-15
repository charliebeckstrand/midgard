import { describe, expect, it } from 'vitest'
import {
	canPlace,
	createGame,
	drawNumber,
	findGap,
	type Game,
	getStatus,
	MAX,
	placeNumber,
	SLOTS,
} from '../utilities/game'

/** Makes a game with the numbers of `placed` in their slots, and `drawn` waiting. */
function makeGame(placed: Record<number, number>, drawn: number | null = null): Game {
	const slots = createGame().slots.map((_, index) => placed[index] ?? null)

	return { slots, drawn, last: drawn }
}

describe('createGame', () => {
	it('makes empty slots and no draw', () => {
		const game = createGame()

		expect(game.slots).toHaveLength(SLOTS)
		expect(game.slots.every((placed) => placed === null)).toBe(true)
		expect(getStatus(game)).toBe('ready')
	})
})

describe('drawNumber', () => {
	it('gives the first free number for the smallest random value', () => {
		expect(drawNumber(makeGame({ 0: 1, 1: 2 }), () => 0).drawn).toBe(3)
	})

	it('gives the last free number for the largest random value', () => {
		expect(drawNumber(makeGame({ 19: MAX }), () => 0.999_999).drawn).toBe(MAX - 1)
	})

	it('never gives a number that a slot holds', () => {
		const game = makeGame({ 0: 5, 1: 6, 2: 7 })

		for (let step = 0; step < 50; step++) {
			const { drawn } = drawNumber(game, () => step / 50)

			expect([5, 6, 7]).not.toContain(drawn)
			expect(drawn).toBeGreaterThanOrEqual(1)
			expect(drawn).toBeLessThanOrEqual(MAX)
		}
	})

	it('keeps the number as the last draw', () => {
		const game = drawNumber(createGame(), () => 0.5)

		expect(game.last).toBe(game.drawn)
		expect(getStatus(game)).toBe('placing')
	})
})

describe('canPlace', () => {
	const slots = makeGame({ 0: 42, 3: 310, 7: 488 }).slots

	it('takes a slot between a smaller and a larger number', () => {
		expect(canPlace(slots, 1, 233)).toBe(true)
		expect(canPlace(slots, 2, 233)).toBe(true)
	})

	it('refuses a slot that breaks the order', () => {
		expect(canPlace(slots, 4, 233)).toBe(false)
		expect(canPlace(slots, 19, 233)).toBe(false)
	})

	it('refuses a slot that holds a number', () => {
		expect(canPlace(slots, 0, 10)).toBe(false)
	})
})

describe('placeNumber', () => {
	it('puts the drawn number in the slot and clears the draw', () => {
		const game = placeNumber(makeGame({}, 500), 9)

		expect(game.slots[9]).toBe(500)
		expect(game.drawn).toBeNull()
		expect(game.last).toBe(500)
	})

	it('changes nothing for a slot that cannot take the number', () => {
		const game = makeGame({ 3: 310 }, 500)

		expect(placeNumber(game, 0)).toBe(game)
	})
})

describe('getStatus', () => {
	it('is a bust when no slot can take the number', () => {
		expect(getStatus(makeGame({ 5: 331, 6: 412 }, 362))).toBe('bust')
	})

	it('is won when each slot holds a number', () => {
		const placed = Object.fromEntries(
			Array.from({ length: SLOTS }, (_, index) => [index, index + 1]),
		)

		expect(getStatus(makeGame(placed))).toBe('won')
	})
})

describe('findGap', () => {
	it('gives the slot that the number goes after', () => {
		expect(findGap(makeGame({ 5: 331, 6: 412 }).slots, 362)).toBe(5)
	})

	it('gives -1 for a number before the first slot', () => {
		expect(findGap(makeGame({ 0: 40 }).slots, 12)).toBe(-1)
	})
})
