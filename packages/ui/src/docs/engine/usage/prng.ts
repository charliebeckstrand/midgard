// The usage engine's only source of randomness: a seeded, pure PRNG so every
// synthesized example is reproducible. A doc seeds from a stable hash of its
// module, so its example is identical on every visit — no `Math.random` ever
// reaches synthesis.

/** A seeded random source; every draw advances the same 32-bit state. */
export type Rng = {
	/** Next float in `[0, 1)`. */
	next(): number

	/** Integer in `[0, max)`; `0` when `max <= 0`. */
	int(max: number): number

	/** A uniformly chosen member; assumes a non-empty list. */
	pick<T>(items: readonly T[]): T
}

/**
 * A `mulberry32` generator over `seed`. Fast, tiny, and good enough for
 * plausible mock data — not cryptographic. Identical seeds yield identical
 * sequences, which is what makes a hashed-module seed a stable example.
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

	return { next, int, pick }
}

/**
 * A stable 32-bit seed from text (FNV-1a). A doc hashes its module specifier so
 * its synthesized example is the same every visit, yet differs between modules.
 */
export function hashSeed(text: string): number {
	let hash = 0x811c9dc5

	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i)

		hash = Math.imul(hash, 0x01000193)
	}

	return hash >>> 0
}
