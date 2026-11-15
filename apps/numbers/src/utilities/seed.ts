/*
 * The seed of a run. The seed is the last segment of the address, such as
 * `/k3x9q2`, so a reader can send a run to another reader. The same seed gives
 * the same numbers in the same order.
 */

/** The characters of a seed that the app makes: the lower-case letters and the digits. */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** The length of a seed that the app makes. */
const SEED_LENGTH = 6

/** A seed that the address can hold: 1 to 32 lower-case letters and digits, so a reader can also type a word. */
const SEED_PATTERN = /^[a-z0-9]{1,32}$/

/** Whether `value` is a seed. */
export function isSeed(value: string): boolean {
	return SEED_PATTERN.test(value)
}

/** Makes a new random seed. */
export function createSeed(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(SEED_LENGTH))

	return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

/**
 * Makes the random source of a seed: a function that gives a number from 0 up
 * to 1, in the same sequence for the same seed. The seed goes through FNV-1a
 * to a 32-bit state, and Mulberry32 steps the state.
 */
export function createRandom(seed: string): () => number {
	let state = 0x811c9dc5

	for (const char of seed) state = Math.imul(state ^ (char.codePointAt(0) ?? 0), 0x01000193)

	return () => {
		state = (state + 0x6d2b79f5) | 0

		let mixed = Math.imul(state ^ (state >>> 15), state | 1)

		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)

		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
	}
}
