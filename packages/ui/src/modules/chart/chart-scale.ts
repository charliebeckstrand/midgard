/**
 * Pure scales for the chart module: a linear value scale with nice ticks and
 * a band scale for categories. Framework- and style-free so the mapping math
 * is unit-testable in isolation; all outputs are in the same user-space units
 * as the `viewBox` the charts render.
 */

import { clamp, extent } from '../../utilities'

/**
 * A linear value scale: the resolved `domain`, the `ticks` spanning it, and
 * `map` from a domain value to a range coordinate.
 *
 * @internal
 */
export type LinearScale = {
	/** Resolved `[floor, ceiling]` after tick rounding and pinning. */
	domain: [number, number]
	/** Tick values, ascending, on clean 1/2/5 steps inside the domain. */
	ticks: number[]
	/** Maps a domain value into the range; out-of-domain values clamp to its edges. */
	map: (value: number) => number
}

/** Options for {@link linearScale}. @internal */
export type LinearScaleOptions = {
	/** Candidate values; non-finite entries are ignored when deriving the domain. */
	values: number[]
	/** Output coordinates for the domain floor and ceiling, in that order. */
	range: [number, number]
	/** Tick count to aim for; the 1/2/5 stepping lands near it, not exactly on it. */
	tickTarget: number
	/**
	 * Anchor the domain at zero (bars grow from a zero baseline).
	 * @defaultValue false
	 */
	zeroBaseline?: boolean
	/** Domain floor override; pinned exactly, skipping tick rounding on that side. */
	min?: number
	/** Domain ceiling override; pinned exactly. */
	max?: number
}

/**
 * Rounds `raw` to the nearest clean tick step: 1, 2, or 5 times a power of
 * ten, whichever lands closest above the raw spacing.
 *
 * @internal
 */
function niceStep(raw: number): number {
	const magnitude = 10 ** Math.floor(Math.log10(raw))

	const unit = raw / magnitude

	if (unit <= 1) return magnitude

	if (unit <= 2) return 2 * magnitude

	if (unit <= 5) return 5 * magnitude

	return 10 * magnitude
}

/**
 * Widens a degenerate (zero-span) domain so the scale has something to
 * divide by: an all-zero zero-baseline domain becomes `[0, 1]`, any other
 * flat value gets a unit of air on each side.
 *
 * @internal
 */
function widen(low: number, high: number, zeroBaseline: boolean): [number, number] {
	if (low !== high) return [low, high]

	if (zeroBaseline && low === 0) return [0, 1]

	return [low - 1, high + 1]
}

/**
 * The data extent seeded with the zero baseline and the pinned bounds — a
 * handful of scalars folded onto {@link extent}'s spread-free pass, so a dense
 * series never reaches `Math.min(...values)`. `null` when nothing — no finite
 * value, no baseline, no pin — yields a domain.
 *
 * @internal
 */
function seededExtent(
	bounds: [number, number] | null,
	zeroBaseline: boolean,
	min: number | undefined,
	max: number | undefined,
): [number, number] | null {
	const seeds = [
		...(zeroBaseline ? [0] : []),
		...(min !== undefined ? [min] : []),
		...(max !== undefined ? [max] : []),
	]

	if (bounds === null && seeds.length === 0) return null

	return [
		Math.min(bounds?.[0] ?? Number.POSITIVE_INFINITY, ...seeds),
		Math.max(bounds?.[1] ?? Number.NEGATIVE_INFINITY, ...seeds),
	]
}

/**
 * Builds a linear value scale over `values`, expanding unpinned bounds to
 * clean tick steps.
 *
 * @returns The scale, or `null` when no finite value (or pin) yields a domain
 * — the caller renders an empty frame.
 * @remarks Non-finite entries are ignored so a stray `NaN` doesn't collapse
 * the scale; a pinned `min`/`max` is kept exact (pinning exists to compare
 * charts on one scale) and out-of-domain values clamp to the range edges.
 * @internal
 */
export function linearScale({
	values,
	range,
	tickTarget,
	zeroBaseline = false,
	min,
	max,
}: LinearScaleOptions): LinearScale | null {
	const bounds = seededExtent(extent(values), zeroBaseline, min, max)

	if (bounds === null) return null

	const [rawLow, rawHigh] = widen(bounds[0], bounds[1], zeroBaseline)

	const step = niceStep((rawHigh - rawLow) / Math.max(1, tickTarget))

	const low = min ?? Math.floor(rawLow / step) * step

	const high = max ?? Math.ceil(rawHigh / step) * step

	const span = high - low

	const firstTick = Math.ceil(low / step) * step

	const ticks: number[] = []

	// A tiny epsilon absorbs float drift so the ceiling tick isn't dropped.
	for (let tick = firstTick; tick <= high + step * 1e-6; tick += step) {
		ticks.push(Math.abs(tick) < step * 1e-6 ? 0 : tick)
	}

	const [from, to] = range

	const map = (value: number) =>
		span === 0 ? (from + to) / 2 : from + clamp((value - low) / span, 0, 1) * (to - from)

	return { domain: [low, high], ticks, map }
}

/**
 * A band scale: evenly sized category slots across the range, each band
 * centered in its slot with symmetric air around it.
 *
 * @internal
 */
export type BandScale = {
	/** Slot width: band plus its share of padding. */
	step: number
	/** Drawable band width inside each slot. */
	width: number
	/** The left edge of band `index`. */
	at: (index: number) => number
	/** The center of band `index` — where line points and x ticks sit. */
	center: (index: number) => number
}

/** Options for {@link bandScale}. @internal */
export type BandScaleOptions = {
	/** How many categories share the range. */
	count: number
	/** Output extent `[start, end]`. */
	range: [number, number]
	/**
	 * Fraction of each slot left as air around its band.
	 * @defaultValue 0.2
	 */
	padding?: number
}

/**
 * Splits the range into `count` equal slots and sizes a centered band inside
 * each; a zero or negative count yields zero-width bands rather than `NaN`s.
 *
 * @internal
 */
export function bandScale({ count, range, padding = 0.2 }: BandScaleOptions): BandScale {
	const [from, to] = range

	const step = count > 0 ? (to - from) / count : 0

	const width = Math.max(0, step * (1 - clamp(padding, 0, 1)))

	const at = (index: number) => from + index * step + (step - width) / 2

	const center = (index: number) => from + index * step + step / 2

	return { step, width, at, center }
}

/**
 * Resolves a pointer coordinate to the index of the band under it, clamped
 * into `[0, count - 1]`; `null` when there are no bands.
 *
 * @internal
 */
export function nearestBandIndex(x: number, scale: BandScale, count: number): number | null {
	if (count <= 0 || scale.step <= 0) return null

	const first = scale.center(0) - scale.step / 2

	return clamp(Math.floor((x - first) / scale.step), 0, count - 1)
}
