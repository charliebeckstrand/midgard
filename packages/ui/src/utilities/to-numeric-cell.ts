/**
 * Coerces a raw data cell to a number: numbers pass through, non-blank numeric
 * strings parse, and everything else — `null`, `undefined`, `''`, whitespace,
 * booleans — becomes `NaN`. A bare `Number()` maps those blanks to a finite
 * `0`, which would read a no-value cell as a real zero (bucketed, plotted,
 * dragging a derived domain's floor). Coerces, doesn't validate: callers
 * follow with their own finite filter.
 */
export function toNumericCell(value: unknown): number {
	if (typeof value === 'number') return value

	if (typeof value === 'string' && value.trim() !== '') return Number(value)

	return Number.NaN
}
