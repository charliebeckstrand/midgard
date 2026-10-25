/** A source of random values that gives the same values for the same seed ({@link createRandom}). */
export type Random = {
	/** A whole number from `min` to `max`, both included. */
	int: (min: number, max: number) => number
	/** One item of `items`. It throws on an empty list. */
	pick: <Item>(items: readonly Item[]) => Item
}

/**
 * A source of random values from `seed`, with the mulberry32 generator. The
 * same seed gives the same values in each language, in the prerender, and in
 * the hydration, so a demo shows the same rows in each of them.
 */
export function createRandom(seed: number): Random {
	let state = seed >>> 0

	/** A number from 0, included, to 1, not included. */
	function next(): number {
		state = (state + 0x6d2b79f5) >>> 0

		let value = state

		value = Math.imul(value ^ (value >>> 15), value | 1)

		value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

		return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
	}

	return {
		int: (min, max) => min + Math.floor(next() * (max - min + 1)),
		pick(items) {
			const item = items[Math.floor(next() * items.length)]

			if (item === undefined) throw new Error('docs: pick needs at least one item')

			return item
		},
	}
}
