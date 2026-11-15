/*
 * The rules of the game. A draw gives a number from 1 to 1000 that no slot
 * holds. The player puts each number in one of the 20 slots, and the slots
 * must stay in ascending order from the first slot to the last. When no empty
 * slot can take the number, the game ends (a bust). When each slot holds a
 * number, the player wins.
 *
 * Each function is pure and returns a new game, so a test can give the random
 * source.
 */

/** The number of slots. */
export const SLOTS = 20

/** The largest number that a draw gives. The smallest is 1. */
export const MAX = 1000

/** The state of one game. */
export type Game = {
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

/** Makes a game with no number in a slot and no draw. */
export function createGame(): Game {
	return { slots: Array.from({ length: SLOTS }, () => null), drawn: null, last: null }
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

/** Gives the step of the game. */
export function getStatus(game: Game): Status {
	if (game.drawn !== null) return hasSlot(game.slots, game.drawn) ? 'placing' : 'bust'

	return game.slots.every((placed) => placed !== null) ? 'won' : 'ready'
}

/**
 * Draws a number that no slot holds. Each such number has the same chance.
 *
 * @param random - The random source, which gives a number from 0 up to 1.
 */
export function drawNumber(game: Game, random: () => number = Math.random): Game {
	const used = new Set(game.slots.filter((placed) => placed !== null))

	// The position of the number among the numbers that are free.
	let position = Math.floor(random() * (MAX - used.size))

	let drawn = 1

	while (used.has(drawn) || position > 0) {
		if (!used.has(drawn)) position--

		drawn++
	}

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
