/**
 * Parses an aspect ratio to its numeric `width / height`, or `null` when the
 * ratio is off or unparseable — where the caller leaves the frame free-form.
 * Chart and map each declare their own `aspectRatio` prop type over the same
 * union and both resolve it through here, so the two can never disagree about
 * which ratios are valid.
 *
 * @remarks Both terms must be positive. A `` `${number}` `` template admits a
 * sign, so `'-4/3'` is a well-typed value the numeric branch rejects as its twin
 * `-4 / 3`; the two forms fall through together. A negative ratio that reached a
 * frame would be an invalid CSS `aspect-ratio` the browser drops, and a negative
 * `viewBox` height that stops the drawing rendering.
 */
export function parseAspectRatio(ratio: number | `${number}/${number}` | false): number | null {
	if (ratio === false) return null

	if (typeof ratio === 'number') return ratio > 0 ? ratio : null

	const [w, h] = ratio.split('/').map(Number)

	return w !== undefined && h !== undefined && w > 0 && h > 0 ? w / h : null
}
