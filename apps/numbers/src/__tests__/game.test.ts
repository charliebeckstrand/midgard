import { describe, expect, it } from 'vitest'
import {
	buildDeck,
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

/** Makes a game of the seed `test` with the numbers of `placed` in their slots, and `drawn` waiting. */
function makeGame(placed: Record<number, number>, drawn: number | null = null): Game {
	const game = createGame('test')

	return { ...game, slots: game.slots.map((_, index) => placed[index] ?? null), drawn, last: drawn }
}

describe('createGame', () => {
	it('makes empty slots and no draw', () => {
		const game = createGame('test')

		expect(game.slots).toHaveLength(SLOTS)
		expect(game.slots.every((placed) => placed === null)).toBe(true)
		expect(getStatus(game)).toBe('ready')
	})

	it('gives the same deck for the same seed', () => {
		expect(createGame('k3x9q2').deck).toEqual(createGame('k3x9q2').deck)
	})

	it('gives another deck for another seed', () => {
		expect(createGame('k3x9q2').deck).not.toEqual(createGame('k3x9q3').deck)
	})
})

describe('buildDeck', () => {
	it('takes 20 different numbers from 1 to 1000', () => {
		const deck = buildDeck(() => 0.999_999)

		expect(deck).toHaveLength(SLOTS)
		expect(new Set(deck).size).toBe(SLOTS)
		expect(deck.every((value) => value >= 1 && value <= MAX)).toBe(true)
	})

	it('takes the numbers in order for the smallest random value', () => {
		expect(buildDeck(() => 0)).toEqual(Array.from({ length: SLOTS }, (_, index) => index + 1))
	})
})

describe('drawNumber', () => {
	it('gives the numbers of the deck in order, whatever the slots', () => {
		let first = createGame('k3x9q2')

		let second = createGame('k3x9q2')

		const draws: number[] = []

		for (let step = 0; step < 3; step++) {
			first = drawNumber(first)

			second = drawNumber(second)

			expect(second.drawn).toBe(first.drawn)

			draws.push(first.drawn as number)

			// Each placement takes a valid slot: the first one in one game and the last one in the other.
			const open = first.slots.flatMap((_, index) =>
				canPlace(first.slots, index, first.drawn as number) ? [index] : [],
			)

			const openSecond = second.slots.flatMap((_, index) =>
				canPlace(second.slots, index, second.drawn as number) ? [index] : [],
			)

			if (open.length === 0 || openSecond.length === 0) break

			first = placeNumber(first, open[0] as number)

			second = placeNumber(second, openSecond.at(-1) as number)
		}

		expect(draws).toEqual(first.deck.slice(0, draws.length))
	})

	it('keeps the number as the last draw', () => {
		const game = drawNumber(createGame('test'))

		expect(game.last).toBe(game.drawn)
		expect(getStatus(game)).toBe('placing')
	})

	it('changes nothing while a number waits', () => {
		const game = drawNumber(createGame('test'))

		expect(drawNumber(game)).toBe(game)
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
