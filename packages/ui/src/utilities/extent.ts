/**
 * The `[min, max]` of the finite entries in `values`, folded in a single pass —
 * `null` when none are finite. A loop rather than `Math.min(...values)`:
 * spreading a large array as call arguments overflows the stack (a `RangeError`
 * past the engine's argument cap — about 130k entries in V8), so a dense data
 * series must reduce rather than spread.
 */
export function extent(values: readonly number[]): [number, number] | null {
	let min = Number.POSITIVE_INFINITY

	let max = Number.NEGATIVE_INFINITY

	for (const value of values) {
		if (!Number.isFinite(value)) continue

		if (value < min) min = value

		if (value > max) max = value
	}

	return min === Number.POSITIVE_INFINITY ? null : [min, max]
}
