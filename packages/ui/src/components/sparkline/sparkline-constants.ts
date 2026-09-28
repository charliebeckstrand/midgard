/**
 * The drawing metrics of a {@link Sparkline}, in the user units of its
 * `viewBox`. The `width` and `height` set the coordinate box. The rest tune the
 * marks: the inter-bar `barGap`, the bar corner `barRadius`, and the end-point
 * marker `pointRadius`.
 *
 * The box is 3:1, as the stepped size of the SVG is at each step (`k.svg`). So
 * the SVG scales the one drawing uniformly, and each step is the same drawing
 * at a different size.
 *
 * @internal
 */
export const SPARKLINE_METRICS = {
	width: 96,
	height: 32,
	barGap: 1.5,
	barRadius: 1,
	pointRadius: 2,
} as const
