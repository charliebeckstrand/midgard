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

/**
 * Chooses the slot of the CPU for `value`. The empty slots that can take the
 * number are a run between two filled slots (or an end). The CPU puts the
 * number in the run in proportion to its place in the open range of the run:
 * with no number placed, 500 goes near the middle, and 990 goes near the end.
 * Gives `-1` when no slot can take the number.
 */
export function chooseSlot(slots: Game['slots'], value: number): number {
	const below = findGap(slots, value)

	// The first filled slot after the run. Each number after it is larger.
	const above = slots.findIndex((placed, index) => index > below && placed !== null)

	const end = above === -1 ? SLOTS : above

	const open = end - below - 1

	if (open === 0) return -1

	const low = slots[below] ?? 0

	const high = slots[end] ?? MAX + 1

	// `value` is between `low` and `high`, so the share is below 1 and the slot is in the run.
	return below + 1 + Math.floor(((value - low) / (high - low)) * open)
}

/**
 * Plays the CPU on the deck of `seed`, for the first `draws` numbers. The CPU
 * places each number with {@link chooseSlot}. When a number has no slot, the
 * CPU stops, and the game keeps that number as its bust.
 */
export function playCpu(seed: string, draws: number): Game {
	let game = createGame(seed)

	for (let draw = 0; draw < draws; draw++) {
		game = drawNumber(game)

		if (game.drawn === null) break

		const slot = chooseSlot(game.slots, game.drawn)

		if (slot === -1) break

		game = placeNumber(game, slot)
	}

	return game
}
