/**
 * Sequential colour-scale primitives shared by the data-driven colour charts —
 * the choropleth and the heatmap: sample an ordered colour ramp, and quantise a
 * numeric domain into equal-interval bins painted from it. Pure and
 * dependency-light so the mapping math is unit-testable in isolation and both
 * modules read one scale rather than forking it.
 *
 * `colorRange` is an ordered list of CSS colour stops, low → high — the
 * data-driven scale the consumer owns (mirrors AG Charts / ECharts / Vega). An
 * exact stop passes through verbatim, so any CSS colour works when a sample
 * lands on one (bins = stops); interpolation between stops goes through
 * {@link parseColor}, so `#rgb`, `rgb(…)`, `oklch(…)`, and the `white` / `black`
 * keywords all mix.
 */

import { parseColor } from './contrast'

/**
 * The colour `t` (0–1) of the way along the ordered `stops`, interpolated in
 * sRGB. An exact stop is returned verbatim; a sample between two stops mixes
 * their channels and returns an `rgb(…)` string.
 *
 * @remarks Out-of-range `t` clamps to `[0, 1]`; a single stop passes through
 * for any `t`.
 */
export function sampleRange(stops: string[], t: number): string {
	const first = stops[0] ?? '#000000'

	if (stops.length === 1) return first

	const pos = Math.min(1, Math.max(0, t)) * (stops.length - 1)

	const index = Math.min(stops.length - 2, Math.floor(pos))

	const frac = pos - index

	const lo = stops[index] ?? first

	if (frac === 0) return lo

	const hi = stops[index + 1] ?? lo

	if (frac === 1) return hi

	const [r1, g1, b1] = parseColor(lo)
	const [r2, g2, b2] = parseColor(hi)

	const mix = (a: number, b: number): number => Math.round((a + (b - a) * frac) * 255)

	return `rgb(${mix(r1, r2)} ${mix(g1, g2)} ${mix(b1, b2)})`
}

/** `n` colours evenly sampled from `range`, low → high. */
export function binColors(range: string[], n: number): string[] {
	if (n <= 1) return [sampleRange(range, 0)]

	return Array.from({ length: n }, (_, i) => sampleRange(range, i / (n - 1)))
}

/** One equal-interval bin: its colour and the `[lo, hi]` value range it covers. */
export type ColorBin = {
	/** The bin's fill, sampled from the colour range. */
	color: string
	/** The bin's lower value edge (inclusive). */
	lo: number
	/** The bin's upper value edge — the domain max on the last bin. */
	hi: number
}

/**
 * The numeric extent of `values` — the explicit override when given, else the
 * `[min, max]` of the finite entries. `null` when nothing pins or spans a
 * domain, so the caller renders no scale.
 */
export function valueExtent(
	values: number[],
	explicit?: [number, number],
): [number, number] | null {
	if (explicit) return explicit

	const finite = values.filter((value) => Number.isFinite(value))

	if (finite.length === 0) return null

	return [Math.min(...finite), Math.max(...finite)]
}

/**
 * Quantises `domain` into equal-interval {@link ColorBin}s sampled from
 * `colorRange`, low → high: one bin per colour stop by default, or `bins`
 * buckets resampled from the stops when set. The last bin's `hi` is pinned to
 * the domain max so the top edge folds in rather than opening a bucket past it.
 */
export function resolveColorBins(
	domain: [number, number],
	colorRange: string[],
	bins?: number,
): ColorBin[] {
	const [min, max] = domain

	const count = Math.max(1, bins ?? colorRange.length)

	const step = (max - min) / count

	return binColors(colorRange, count).map((color, bin) => ({
		color,
		lo: min + bin * step,
		hi: bin === count - 1 ? max : min + (bin + 1) * step,
	}))
}

/**
 * The equal-interval bin index `value` falls in across a `count`-bucket
 * `domain`: the top edge clamps into the last bin, a zero-span domain places
 * every value in bin `0`, and a non-finite value or a non-positive `count`
 * reads `null` — the no-data case.
 */
export function binIndex(value: number, domain: [number, number], count: number): number | null {
	if (count < 1 || !Number.isFinite(value)) return null

	const [min, max] = domain

	const span = max - min

	if (span <= 0) return 0

	return Math.min(count - 1, Math.max(0, Math.floor(((value - min) / span) * count)))
}

/**
 * The `p`-quantile (0–1) of an ascending, non-empty `sorted` array, linearly
 * interpolated between the two straddling samples; `p` clamps to `[0, 1]`.
 *
 * @internal
 */
function quantileAt(sorted: number[], p: number): number {
	const last = sorted.length - 1

	if (last <= 0) return sorted[0] ?? 0

	const pos = Math.min(1, Math.max(0, p)) * last

	const lo = Math.floor(pos)

	const frac = pos - lo

	const a = sorted[lo] as number

	const b = sorted[Math.min(last, lo + 1)] as number

	return a + (b - a) * frac
}

/**
 * The `count - 1` interior cut points splitting `values` into `count`
 * equal-count (quantile) buckets — the value at each `i / count` quantile of the
 * sorted finite values. Empty when there is nothing to split (no finite values,
 * a flat domain, or `count < 2`), so the caller paints a single bin. Ties leave
 * repeated edges — the standard quantile-scale behaviour — so a heavily
 * duplicated value can leave some buckets zero-width rather than forcing an even
 * split that identical values can't honour.
 */
export function quantileThresholds(values: number[], count: number): number[] {
	const finite = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)

	const first = finite[0]

	const last = finite.at(-1)

	if (count < 2 || first === undefined || first === last) return []

	return Array.from({ length: count - 1 }, (_, i) => quantileAt(finite, (i + 1) / count))
}

/**
 * The bin index `value` falls in for the quantile `thresholds` (from {@link
 * quantileThresholds}): the number of thresholds it meets or exceeds, so a value
 * sitting on an edge reads into the upper bucket (a right-bisect). `null` for a
 * non-finite value — the no-data case — and bin `0` for every finite value when
 * there are no thresholds (a single bucket).
 */
export function quantileBinIndex(value: number, thresholds: number[]): number | null {
	if (!Number.isFinite(value)) return null

	let bin = 0

	while (bin < thresholds.length && value >= (thresholds[bin] as number)) bin++

	return bin
}

/**
 * Splits `values` into equal-count quantile {@link ColorBin}s painted from
 * `colorRange`, low → high — the skew-aware counterpart to {@link
 * resolveColorBins}'s equal-interval buckets, so each shade covers a similar
 * number of rows rather than a similar value span. Returns the bins and the
 * {@link quantileThresholds} rows are assigned by ({@link quantileBinIndex}).
 * `bins` buckets by default one per colour stop; ties or a flat domain yield
 * fewer real buckets, so the painted bin count tracks the actual edges rather
 * than mapping a colour onto a bucket the data can't fill.
 */
export function resolveQuantileBins(
	values: number[],
	colorRange: string[],
	bins?: number,
): { bins: ColorBin[]; thresholds: number[] } {
	const finite = values.filter((value) => Number.isFinite(value))

	if (finite.length === 0) return { bins: [], thresholds: [] }

	const min = Math.min(...finite)

	const max = Math.max(...finite)

	const thresholds = quantileThresholds(finite, Math.max(1, bins ?? colorRange.length))

	// The painted buckets are the edges the data actually produced: `min`, each
	// threshold, `max` — a flat domain (no thresholds) is one bin, otherwise the
	// requested count — so a colour never maps onto a bucket the data can't fill.
	const edges = [min, ...thresholds, max]

	return {
		bins: binColors(colorRange, thresholds.length + 1).map((color, i) => ({
			color,
			lo: edges[i] as number,
			hi: edges[i + 1] as number,
		})),
		thresholds,
	}
}
