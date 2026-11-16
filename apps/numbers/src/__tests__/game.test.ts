import { describe, expect, it } from 'vitest'
import {
	buildDeck,
	canPlace,
	chooseSlot,
	countPlaced,
	createGame,
	DIFFICULTIES,
	type Difficulty,
	drawNumber,
	findGap,
	type Game,
	getOutcome,
	getStatus,
	isUnfinished,
	MAX,
	placeNumber,
	playCpu,
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

describe('isUnfinished', () => {
	it('is true for a run with a placement that has not ended', () => {
		expect(isUnfinished(makeGame({ 3: 200 }))).toBe(true)

		expect(isUnfinished(makeGame({ 3: 200 }, 500))).toBe(true)
	})

	it('is false for a run with no placement', () => {
		expect(isUnfinished(createGame('test'))).toBe(false)

		expect(isUnfinished(makeGame({}, 500))).toBe(false)
	})

	it('is false for a run that ended in a bust or a win', () => {
		expect(isUnfinished(makeGame({ 5: 331, 6: 412 }, 362))).toBe(false)

		const placed = Object.fromEntries(
			Array.from({ length: SLOTS }, (_, index) => [index, index + 1]),
		)

		expect(isUnfinished(makeGame(placed))).toBe(false)
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

describe('countPlaced', () => {
	it('counts the filled slots', () => {
		expect(countPlaced(createGame('test').slots)).toBe(0)
		expect(countPlaced(makeGame({ 0: 5, 7: 400, 19: 990 }).slots)).toBe(3)
	})
})

describe('chooseSlot', () => {
	it('places a number in proportion at normal to the open range', () => {
		const { slots } = makeGame({})

		expect(chooseSlot(slots, 1, 'normal')).toBe(0)
		expect(chooseSlot(slots, 500, 'normal')).toBe(9)
		expect(chooseSlot(slots, 501, 'normal')).toBe(10)
		expect(chooseSlot(slots, MAX, 'normal')).toBe(SLOTS - 1)
	})

	it('places a number in the run between its two neighbors', () => {
		// Slots 5 to 14 are open between 100 and 200, so 150 goes near the middle of the run.
		const { slots } = makeGame({ 4: 100, 15: 200 })

		expect(chooseSlot(slots, 150, 'normal')).toBe(10)
		expect(chooseSlot(slots, 101, 'normal')).toBe(5)
		expect(chooseSlot(slots, 199, 'normal')).toBe(14)
	})

	it('places a number in the middle of its run at easy', () => {
		expect(chooseSlot(makeGame({}).slots, 1, 'easy')).toBe(10)
		expect(chooseSlot(makeGame({ 4: 100, 15: 200 }).slots, 199, 'easy')).toBe(10)
		expect(chooseSlot(makeGame({ 4: 100, 15: 200 }).slots, 50, 'easy')).toBe(2)
	})

	it('keeps room on each side of a number at hard', () => {
		const { slots } = makeGame({})

		// 500 is in the middle of the range, so each side expects the same count of numbers.
		expect(chooseSlot(slots, 500, 'hard')).toBe(9)
		// A small number leaves no room below it, and a large number no room above it.
		expect(chooseSlot(slots, 1, 'hard')).toBe(0)
		expect(chooseSlot(slots, MAX, 'hard')).toBe(SLOTS - 1)
		// With one slot open, the number goes there.
		const full = makeGame(
			Object.fromEntries(Array.from({ length: SLOTS - 1 }, (_, index) => [index, index + 1])),
		)

		expect(chooseSlot(full.slots, 600, 'hard')).toBe(SLOTS - 1)
	})

	it('gives a slot that can take the number at each level', () => {
		const { slots } = makeGame({ 2: 300, 3: 310, 10: 700 })

		for (const difficulty of DIFFICULTIES) {
			for (const value of [1, 299, 400, 699, 701, MAX]) {
				expect(canPlace(slots, chooseSlot(slots, value, difficulty), value)).toBe(true)
			}
		}
	})

	it('gives -1 when no slot can take the number', () => {
		for (const difficulty of DIFFICULTIES) {
			expect(chooseSlot(makeGame({ 2: 300, 3: 310 }).slots, 305, difficulty)).toBe(-1)
		}
	})
})

describe('playCpu', () => {
	it('plays the first draws of the deck of the seed', () => {
		const cpu = playCpu('k3x9q2', 3, 'normal')

		expect(countPlaced(cpu.slots)).toBe(3)
		expect(
			cpu.slots.filter((placed) => placed !== null).toSorted((a, b) => (a ?? 0) - (b ?? 0)),
		).toEqual(cpu.deck.slice(0, 3).toSorted((a, b) => a - b))
		expect(getStatus(cpu)).toBe('ready')
	})

	it('gives the same game for the same seed', () => {
		expect(playCpu('k3x9q2', SLOTS, 'normal')).toEqual(playCpu('k3x9q2', SLOTS, 'normal'))
	})

	it('fills more slots at each higher level, on average', () => {
		const average = (difficulty: Difficulty) => {
			let total = 0

			for (let seed = 0; seed < 2000; seed++) {
				total += countPlaced(playCpu(`s${seed}`, SLOTS, difficulty).slots)
			}

			return total / 2000
		}

		const [easy = 0, normal = 0, hard = 0] = DIFFICULTIES.map(average)

		expect(normal - easy).toBeGreaterThan(1)
		expect(hard - normal).toBeGreaterThan(0.4)
	})

	it('stops at a bust, and keeps the number', () => {
		const cpu = playCpu('k3x9q2', SLOTS, 'normal')

		const status = getStatus(cpu)

		expect(['bust', 'won']).toContain(status)

		if (status === 'bust') expect(cpu.drawn).toBe(cpu.deck[countPlaced(cpu.slots)])
	})
})

describe('getOutcome', () => {
	it('gives the win to the higher count of filled slots', () => {
		expect(getOutcome(makeGame({ 0: 10, 1: 20 }), makeGame({ 0: 10 }))).toBe('win')
		expect(getOutcome(makeGame({ 0: 10 }), makeGame({ 0: 10, 1: 20 }))).toBe('loss')
	})

	it('gives a tie for the same count, also for two full games', () => {
		expect(getOutcome(makeGame({ 3: 400 }), makeGame({ 9: 900 }))).toBe('tie')

		const full = Object.fromEntries(Array.from({ length: SLOTS }, (_, index) => [index, index + 1]))

		expect(getOutcome(makeGame(full), makeGame(full))).toBe('tie')
	})
})
