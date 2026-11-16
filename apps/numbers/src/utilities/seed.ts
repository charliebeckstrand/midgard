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
	return toDailySeed(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * The seed of the daily puzzle of the reader at the instant `now`, for a reader
 * whose time zone is `offset` minutes behind UTC, as `getTimezoneOffset` gives
 * it. The server does not know the time zone of the reader, so it uses the
 * offset of a cookie (see `utilities/reader-offset`).
 */
export function dailySeedAt(now: number, offset: number): string {
	const local = new Date(now - offset * 60_000)

	return toDailySeed(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
}

/**
 * Whether `seed` is the seed of a daily puzzle: a real date as `YYYYMMDD`, such
 * as `20261115`. A seed that the app makes has 6 characters, so it is never a
 * date. Any date counts, of today or of an earlier day, because each is the
 * page of a daily puzzle.
 */
export function isDailySeed(seed: string): boolean {
	if (!/^\d{8}$/.test(seed)) return false

	const year = Number(seed.slice(0, 4))

	const month = Number(seed.slice(4, 6)) - 1

	const day = Number(seed.slice(6))

	const date = new Date(Date.UTC(year, month, day))

	return toDailySeed(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) === seed
}

/** The seed of the date of `year`, `month` (from 0), and `day`, as `YYYYMMDD`. */
function toDailySeed(year: number, month: number, day: number): string {
	return `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`
}

/** The first segment of the address of a run against the CPU, such as `/vs/k3x9q2`. */
export const VS_SEGMENT = 'vs'

/** A route of the menu: solo (the Standard item), Vs CPU, or Daily puzzle. */
export type Route = 'solo' | 'vsCpu' | 'daily'

/** The label of each route, in the menu and in the trail of the header. */
export const ROUTE_LABELS: Record<Route, string> = {
	solo: 'Standard',
	vsCpu: 'Vs CPU',
	daily: 'Daily puzzle',
}

/**
 * The route of the menu that the run of `seed` is on. A run against the CPU is
 * on Vs CPU, also with a date seed, because only a solo run plays the daily
 * puzzle. A solo run of a date seed is on Daily puzzle.
 */
export function getRoute(seed: string, vsCpu: boolean): Route {
	if (vsCpu) return 'vsCpu'

	return isDailySeed(seed) ? 'daily' : 'solo'
}

/** The address of the run of `seed`: `/k3x9q2`, or `/vs/k3x9q2` against the CPU. */
export function runPath(seed: string, vsCpu: boolean): string {
	return vsCpu ? `/${VS_SEGMENT}/${seed}` : `/${seed}`
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
