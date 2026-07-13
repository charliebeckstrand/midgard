// The usage engine's only source of randomness: a seeded, pure PRNG so every
// synthesized example is reproducible from its seed alone, and a base36 codec
// that carries that seed in the URL. No global `Math.random` reaches synthesis
// — `randomSeed` is the one impure call, made by the chrome to mint a fresh
// seed on re-roll, never during synthesis itself.

/** A seeded random source; every draw advances the same 32-bit state. */
export type Rng = {
	/** Next float in `[0, 1)`. */
	next(): number

	/** Integer in `[0, max)`; `0` when `max <= 0`. */
	int(max: number): number

	/** A uniformly chosen member; assumes a non-empty list. */
	pick<T>(items: readonly T[]): T

	/** True with probability `p` (clamped to `[0, 1]`). */
	chance(p: number): boolean
}

/**
 * A `mulberry32` generator over `seed`. Fast, tiny, and good enough for
 * plausible mock data — not cryptographic. Identical seeds yield identical
 * sequences across engines, which is what makes `?seed=` shareable.
 */
export function makeRng(seed: number): Rng {
	let state = seed >>> 0

	const next = (): number => {
		state = (state + 0x6d2b79f5) | 0

		let t = Math.imul(state ^ (state >>> 15), 1 | state)

		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}

	const int = (max: number): number => (max <= 0 ? 0 : Math.floor(next() * max))

	const pick = <T>(items: readonly T[]): T => items[int(items.length)] as T

	return {
		next,
		int,
		pick,
		chance: (p) => next() < p,
	}
}

/** Parse a base36 `?seed=` token to a `uint32`, or `null` when malformed. */
export function parseSeed(token: string | null | undefined): number | null {
	if (!token) return null

	const value = Number.parseInt(token, 36)

	return Number.isFinite(value) && value >= 0 ? value >>> 0 : null
}

/** The URL form of a seed: compact, lowercase base36. */
export function formatSeed(seed: number): string {
	return (seed >>> 0).toString(36)
}

/** A fresh random seed for a re-roll; the sole impurity, never called in synthesis. */
export function randomSeed(): number {
	return Math.floor(Math.random() * 0x1_0000_0000) >>> 0
}
