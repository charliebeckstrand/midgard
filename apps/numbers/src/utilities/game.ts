/*
 * The rules of the game. Each run has a deck of 20 different numbers from 1 to
 * 1000, which its seed gives. Each draw gives the next number of the deck. The
 * player puts each number in one of the 20 slots, and the slots must stay in
 * ascending order from the first slot to the last. When no empty slot can take
 * the number, the game ends (a bust). When each slot holds a number, the
 * player wins.
 *
 * Each function is pure and returns a new game, so the same seed and the same
 * placements give the same game.
 */

import { createRandom } from './seed'

/** The number of slots. */
export const SLOTS = 20

/** The largest number that a draw gives. The smallest is 1. */
export const MAX = 1000

/** The state of one game. */
export type Game = {
	/** The seed of the run, which gives the deck. */
	seed: string
	/** The numbers of the run, in the order of their draws. */
	deck: readonly number[]
	/** The number in each slot, in slot order. An empty slot is `null`. */
	slots: readonly (number | null)[]
	/** The number that waits for a slot, or `null` before the first draw and after each placement. */
	drawn: number | null
	/** The last number that a draw gave, which the readout keeps after the player places it. */
	last: number | null
}

/**
 * The step of a game: `ready` for a draw, `placing` while a number waits for a
 * slot, `bust` when the number has no slot, and `won` when each slot holds a
 * number.
 */
export type Status = 'ready' | 'placing' | 'bust' | 'won'

/**
 * Builds the deck of a run: 20 different numbers from 1 to {@link MAX}, each
 * with the same chance. A partial Fisher-Yates shuffle takes them.
 *
 * @param random - The random source, which gives a number from 0 up to 1.
 */
export function buildDeck(random: () => number): number[] {
	const pool = Array.from({ length: MAX }, (_, index) => index + 1)

	for (let i = 0; i < SLOTS; i++) {
		const j = i + Math.floor(random() * (MAX - i))

		const picked = pool[j] as number

		pool[j] = pool[i] as number

		pool[i] = picked
	}

	return pool.slice(0, SLOTS)
}

/** Makes the game of a seed, with no number in a slot and no draw. */
export function createGame(seed: string): Game {
	return {
		seed,
		deck: buildDeck(createRandom(seed)),
		slots: Array.from({ length: SLOTS }, () => null),
		drawn: null,
		last: null,
	}
}

/**
 * Whether the slot at `index` can take `value`: the slot is empty, each number
 * before it is smaller, and each number after it is larger.
 */
export function canPlace(slots: Game['slots'], index: number, value: number): boolean {
	if (slots[index] !== null) return false

	return slots.every((placed, slot) => {
		if (placed === null) return true

		return slot < index ? placed < value : placed > value
	})
}

/** Whether one or more slots can take `value`. */
export function hasSlot(slots: Game['slots'], value: number): boolean {
	return slots.some((_, index) => canPlace(slots, index, value))
}

/** Counts the filled slots: the score of the run. */
export function countPlaced(slots: Game['slots']): number {
	return slots.filter((placed) => placed !== null).length
}

/** Gives the step of the game. */
export function getStatus(game: Game): Status {
	if (game.drawn !== null) return hasSlot(game.slots, game.drawn) ? 'placing' : 'bust'

	return game.slots.every((placed) => placed !== null) ? 'won' : 'ready'
}

/**
 * Whether the run has a placement and has not ended in a bust or a win. A Reset
 * counts such a run toward the stats, with its score at that step.
 */
export function isUnfinished(game: Game): boolean {
	const status = getStatus(game)

	return status !== 'bust' && status !== 'won' && countPlaced(game.slots) > 0
}

/**
 * Draws the next number of the deck. Each number of the deck before it is in a
 * slot, so the count of the filled slots is the position of the draw. A game
 * with a waiting number, or with no number left, stays as it is.
 */
export function drawNumber(game: Game): Game {
	if (game.drawn !== null) return game

	const drawn = game.deck[countPlaced(game.slots)]

	if (drawn === undefined) return game

	return { ...game, drawn, last: drawn }
}

/** Puts the drawn number in the slot at `index`. The slot must take it (see {@link canPlace}). */
export function placeNumber(game: Game, index: number): Game {
	const { drawn } = game

	if (drawn === null || !canPlace(game.slots, index, drawn)) return game

	return { ...game, slots: game.slots.with(index, drawn), drawn: null }
}

/**
 * Finds the position of a number that has no slot: the index of the last slot
 * whose number is smaller. The number goes after that slot, and `-1` puts it
 * before the first slot.
 */
export function findGap(slots: Game['slots'], value: number): number {
	return slots.findLastIndex((placed) => placed !== null && placed < value)
}

/** The level of the CPU: how well it chooses its slots (see {@link chooseSlot}). */
export type Difficulty = 'easy' | 'normal' | 'hard'

/** The levels of the CPU, from the weakest. */
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard']

/** The name of each level of the CPU. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
	easy: 'Easy',
	normal: 'Normal',
	hard: 'Hard',
}

/** The empty slots that can take a number: `open` slots from `start`, with `low` below and `high` above. */
type Run = { start: number; open: number; low: number; high: number }

/**
 * Finds the run of `value`: the empty slots between the two filled slots (or
 * an end) that `value` goes between. Each slot that can take the number is in
 * the run. Gives `null` when no slot can take the number.
 */
function findRun(slots: Game['slots'], value: number): Run | null {
	const below = findGap(slots, value)

	// The first filled slot after the run. Each number after it is larger.
	const above = slots.findIndex((placed, index) => index > below && placed !== null)

	const end = above === -1 ? SLOTS : above

	const open = end - below - 1

	if (open === 0) return null

	return { start: below + 1, open, low: slots[below] ?? 0, high: slots[end] ?? MAX + 1 }
}

/**
 * The chance that a part of the range with `room` empty slots gets `room`
 * numbers or fewer from the next `draws` draws, when each draw falls in the
 * part with the chance `share`: the binomial distribution, summed to `room`.
 */
function fitChance(draws: number, share: number, room: number): number {
	let term = (1 - share) ** draws

	let sum = 0

	for (let count = 0; count <= Math.min(room, draws); count++) {
		sum += term

		term *= ((draws - count) / (count + 1)) * (share / (1 - share))
	}

	return sum
}

/** The rule of each level of the CPU: the slot in the run of `value`, from its offset in the run. */
const STRATEGIES: Record<Difficulty, (run: Run, value: number, slots: Game['slots']) => number> = {
	// The middle of the run, whatever the number is.
	easy: ({ open }) => Math.floor(open / 2),

	// In proportion to the place of the number in the open range of the run.
	// `value` is between `low` and `high`, so the share is below 1.
	normal: ({ open, low, high }, value) => Math.floor(((value - low) / (high - low)) * open),

	// The slot that gives the best chance that each side of the number has room
	// for the numbers that fall there. Each slot that is empty after this
	// placement takes one more draw, so that count is the count of the draws.
	hard: ({ open, low, high }, value, slots) => {
		const draws = slots.filter((placed) => placed === null).length - 1

		const below = (value - low - 1) / MAX

		const above = (high - value - 1) / MAX

		let best = 0

		let bestChance = -1

		for (let offset = 0; offset < open; offset++) {
			const chance = fitChance(draws, below, offset) * fitChance(draws, above, open - 1 - offset)

			if (chance > bestChance) {
				best = offset

				bestChance = chance
			}
		}

		return best
	},
}

/**
 * Chooses the slot of the CPU for `value`, at `difficulty`. The empty slots
 * that can take the number are a run between two filled slots (or an end).
 *
 * - `easy` puts the number in the middle of the run.
 * - `normal` puts the number in the run in proportion to its place in the open
 *   range of the run: with no number placed, 500 goes near the middle, and 990
 *   goes near the end.
 * - `hard` puts the number where the two sides of it most likely have room for
 *   the numbers that the rest of the draws put there.
 *
 * Gives `-1` when no slot can take the number.
 */
export function chooseSlot(slots: Game['slots'], value: number, difficulty: Difficulty): number {
	const run = findRun(slots, value)

	if (!run) return -1

	return run.start + STRATEGIES[difficulty](run, value, slots)
}

/**
 * Plays the CPU at `difficulty` on the deck of `seed`, for the first `draws`
 * numbers. The CPU places each number with {@link chooseSlot}. When a number
 * has no slot, the CPU stops, and the game keeps that number as its bust.
 */
export function playCpu(seed: string, draws: number, difficulty: Difficulty): Game {
	let game = createGame(seed)

	for (let draw = 0; draw < draws; draw++) {
		game = drawNumber(game)

		if (game.drawn === null) break

		const slot = chooseSlot(game.slots, game.drawn, difficulty)

		if (slot === -1) break

		game = placeNumber(game, slot)
	}

	return game
}

/** The result of a game against the CPU, after the game of the player ends. */
export type Outcome = 'win' | 'loss' | 'tie'

/** Gives the result of `game` against `cpu`: the higher count of filled slots wins. */
export function getOutcome(game: Game, cpu: Game): Outcome {
	const player = countPlaced(game.slots)

	const opponent = countPlaced(cpu.slots)

	if (player === opponent) return 'tie'

	return player > opponent ? 'win' : 'loss'
}
