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

/**
 * The seed of the daily puzzle of `date`: the date as `YYYYMMDD`, such as
 * `20261115`. The date is in the time zone of the reader, so each reader gets
 * a new puzzle at their own midnight.
 */
export function dailySeed(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0')

	const day = String(date.getDate()).padStart(2, '0')

	return `${date.getFullYear()}${month}${day}`
}

/** The first segment of the address of a run against the CPU, such as `/cpu/k3x9q2`. */
export const CPU_SEGMENT = 'cpu'

/** The address of the run of `seed`: `/k3x9q2`, or `/cpu/k3x9q2` against the CPU. */
export function runPath(seed: string, vsCpu: boolean): string {
	return vsCpu ? `/${CPU_SEGMENT}/${seed}` : `/${seed}`
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
