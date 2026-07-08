/**
 * Pure scales for the chart module: a linear value scale with nice ticks and
 * a band scale for categories. Framework- and style-free so the mapping math
 * is unit-testable in isolation; all outputs are in the same user-space units
 * as the `viewBox` the charts render.
 */

import { clamp } from '../../utilities'

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
	/**
	 * Pixels of clear room to reserve between a data extreme and its unpinned
	 * domain edge — the space a value label needs to sit above the peak or below
	 * the trough instead of flipping onto the line. Applied only where the nice
	 * ceiling / floor doesn't already leave that much air, and never past a pinned
	 * bound. Ticks stay on their clean steps; the widened edge just carries no
	 * tick of its own.
	 * @defaultValue 0
	 */
	headroom?: number
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
 * One domain bound: the pin when given, else the data extent on a tight (spark)
 * scale, else `raw` rounded outward to a clean tick step.
 *
 * @internal
 */
function niceBound(
	pin: number | undefined,
	raw: number,
	step: number,
	tight: boolean,
	round: (n: number) => number,
): number {
	if (pin !== undefined) return pin

	return tight ? raw : round(raw / step) * step
}

/**
 * The largest share of the range a headroom reservation may take per side. At
 * the cap, a both-sided reservation still leaves the data half the plot; past
 * it the plot is too short to afford labels at all, so nothing is reserved and
 * {@link headroomFits} — the same predicate — tells the layout to shed them.
 *
 * @internal
 */
const HEADROOM_CAP = 0.25

/**
 * Whether a `headroom` px reservation is affordable over a `rangePx`-long
 * range — at most {@link HEADROOM_CAP} of the range per side. The single
 * arbiter for the value-label room: {@link reserveHeadroom} reserves only when
 * it holds, and the layout sheds the labels when it doesn't, so the reserved
 * space and the labels that need it can never disagree.
 *
 * @internal
 */
export function headroomFits(headroom: number, rangePx: number): boolean {
	return headroom > 0 && rangePx > 0 && headroom / rangePx <= HEADROOM_CAP
}

/**
 * Widens the unpinned bounds so each data extreme sits `headroom` px clear of
 * its edge — the room a value label needs above the peak or below the trough
 * instead of flipping onto the line. `f` is that gap as a fraction of the
 * range, and the widened span is solved so the fraction holds in the final
 * scale (a naive px→value pass under-reserves, since widening grows the span).
 * A bound is left alone when it is pinned or its nice step already clears the
 * extreme by `f`; when both sides widen they share one span so neither crowds.
 * An unaffordable ask (see {@link headroomFits}) reserves nothing — the layout
 * sheds the labels by the same test, so no label renders against unreserved
 * edges.
 *
 * @internal
 */
function reserveHeadroom(args: {
	low: number
	high: number
	rawLow: number
	rawHigh: number
	rangePx: number
	headroom: number
	pinnedLow: boolean
	pinnedHigh: boolean
}): [number, number] {
	const { low, high, rawLow, rawHigh, rangePx, headroom, pinnedLow, pinnedHigh } = args

	if (!headroomFits(headroom, rangePx)) return [low, high]

	const f = headroom / rangePx

	const baseSpan = high - low

	const widenLow = !pinnedLow && rawLow - low < f * baseSpan

	const widenHigh = !pinnedHigh && high - rawHigh < f * baseSpan

	if (widenLow && widenHigh) {
		const span = (rawHigh - rawLow) / (1 - 2 * f)

		return [rawLow - f * span, rawHigh + f * span]
	}

	if (widenHigh) return [low, (rawHigh - f * low) / (1 - f)]

	if (widenLow) return [(rawLow - f * high) / (1 - f), high]

	return [low, high]
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
	headroom = 0,
}: LinearScaleOptions): LinearScale | null {
	const finite = values.filter((value) => Number.isFinite(value))

	if (zeroBaseline) finite.push(0)

	if (min !== undefined) finite.push(min)

	if (max !== undefined) finite.push(max)

	if (finite.length === 0) return null

	const [rawLow, rawHigh] = widen(Math.min(...finite), Math.max(...finite), zeroBaseline)

	// A spark scale carries no axis to align to (`tickTarget` 0), so it fits the
	// domain to the data extent rather than nice-stepping it — a nice-stepped
	// sparkline sinks into a band of empty air instead of filling its box. Pins
	// still win on their own side either way.
	const tight = tickTarget <= 0

	const step = tight ? 0 : niceStep((rawHigh - rawLow) / Math.max(1, tickTarget))

	const [low, high] = reserveHeadroom({
		low: niceBound(min, rawLow, step, tight, Math.floor),
		high: niceBound(max, rawHigh, step, tight, Math.ceil),
		rawLow,
		rawHigh,
		rangePx: Math.abs(range[1] - range[0]),
		headroom: tight ? 0 : headroom,
		pinnedLow: min !== undefined,
		pinnedHigh: max !== undefined,
	})

	const span = high - low

	const ticks: number[] = []

	// A tiny epsilon absorbs float drift so the ceiling tick isn't dropped; a
	// tight spark scale draws none at all.
	if (!tight) {
		for (let tick = Math.ceil(low / step) * step; tick <= high + step * 1e-6; tick += step) {
			ticks.push(Math.abs(tick) < step * 1e-6 ? 0 : tick)
		}
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
