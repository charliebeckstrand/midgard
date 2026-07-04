/**
 * Pure geometry for the {@link BarChart}: grouped bars as zero-baseline spans
 * rendered to one-end-rounded paths, independent of React and styling so the
 * mark math is unit-testable in isolation. One slot-splitting pass serves both
 * orientations; only the path and the hit rect transpose, through
 * {@link barSpan}.
 */

import { BAR_END_RADIUS, BAR_MAX_WIDTH, MARK_GAP } from '../chart-constants'
import type { ChartOrientation } from '../chart-orientation'
import type { BandScale } from '../chart-scale'

/** One drawable bar: its path, hit rect, and the animation facts about it. @internal */
export type BarMark = {
	/** One-end-rounded path: a 4px arc on the data end, square at the baseline. */
	d: string
	/** The bar's left edge, in `viewBox` units. */
	x: number
	/** The bar's right edge. */
	x1: number
	/** The drawn span's lesser y — the data end above the baseline, or the baseline. */
	top: number
	/** The drawn span's greater y. */
	bottom: number
	/** Stable series-and-category key: geometry-free, so a resize never remounts the mark. */
	key: string
	/** Whether the bar's data end sits past the baseline on the positive side — up, or to the right. */
	positive: boolean
}

/**
 * The bar's rounded-end radius, clamped to its own length and half-thickness so
 * a short or thin bar never inverts.
 *
 * @internal
 */
function endRadius(valuePos: number, baseline: number, thickness: number): number {
	return Math.min(BAR_END_RADIUS, Math.abs(baseline - valuePos), thickness / 2)
}

/**
 * The rounded-end bar path from `baseline` to `valueY`, thickness `x0`→`x1`.
 * `rect` + `rx` is off-spec here — it would round the baseline end too.
 *
 * @internal
 */
function verticalBarPath(x0: number, x1: number, valueY: number, baseline: number): string {
	const radius = endRadius(valueY, baseline, x1 - x0)

	if (valueY < baseline) {
		const shoulder = valueY + radius

		return [
			`M ${x0} ${baseline}`,
			`L ${x0} ${shoulder}`,
			`A ${radius} ${radius} 0 0 1 ${x0 + radius} ${valueY}`,
			`L ${x1 - radius} ${valueY}`,
			`A ${radius} ${radius} 0 0 1 ${x1} ${shoulder}`,
			`L ${x1} ${baseline}`,
			'Z',
		].join(' ')
	}

	const shoulder = valueY - radius

	return [
		`M ${x0} ${baseline}`,
		`L ${x0} ${shoulder}`,
		`A ${radius} ${radius} 0 0 0 ${x0 + radius} ${valueY}`,
		`L ${x1 - radius} ${valueY}`,
		`A ${radius} ${radius} 0 0 0 ${x1} ${shoulder}`,
		`L ${x1} ${baseline}`,
		'Z',
	].join(' ')
}

/**
 * The vertical path's transpose: the span runs along x from `baseline` to
 * `valueX`, thickness `y0`→`y1`, rounded at the `valueX` data end.
 *
 * @internal
 */
function horizontalBarPath(y0: number, y1: number, valueX: number, baseline: number): string {
	const radius = endRadius(valueX, baseline, y1 - y0)

	if (valueX > baseline) {
		const shoulder = valueX - radius

		return [
			`M ${baseline} ${y0}`,
			`L ${shoulder} ${y0}`,
			`A ${radius} ${radius} 0 0 1 ${valueX} ${y0 + radius}`,
			`L ${valueX} ${y1 - radius}`,
			`A ${radius} ${radius} 0 0 1 ${shoulder} ${y1}`,
			`L ${baseline} ${y1}`,
			'Z',
		].join(' ')
	}

	const shoulder = valueX + radius

	return [
		`M ${baseline} ${y0}`,
		`L ${shoulder} ${y0}`,
		`A ${radius} ${radius} 0 0 0 ${valueX} ${y0 + radius}`,
		`L ${valueX} ${y1 - radius}`,
		`A ${radius} ${radius} 0 0 0 ${shoulder} ${y1}`,
		`L ${baseline} ${y1}`,
		'Z',
	].join(' ')
}

/**
 * One bar from its value-axis span (`baseline`→`valuePos`) and its band-axis
 * slot (`c0`→`c1`). Vertical draws the span up y with the slot across x;
 * horizontal transposes both, and the hit rect follows so `withinBarMarks`
 * reads either the same way.
 *
 * @internal
 */
function barSpan(
	orientation: ChartOrientation,
	valuePos: number,
	baseline: number,
	c0: number,
	c1: number,
	key: string,
): BarMark {
	if (orientation === 'vertical') {
		return {
			d: verticalBarPath(c0, c1, valuePos, baseline),
			x: c0,
			x1: c1,
			top: Math.min(valuePos, baseline),
			bottom: Math.max(valuePos, baseline),
			key,
			positive: valuePos < baseline,
		}
	}

	return {
		d: horizontalBarPath(c0, c1, valuePos, baseline),
		x: Math.min(valuePos, baseline),
		x1: Math.max(valuePos, baseline),
		top: c0,
		bottom: c1,
		key,
		positive: valuePos > baseline,
	}
}

/**
 * Projects series-major values onto grouped bar marks: each category's band
 * splits into per-series bars capped at the spec thickness, separated by the
 * surface gap, and centered as a group in their band.
 *
 * @remarks A `null` value yields a `null` mark (an omitted bar, not a zero
 * one); an exact zero yields `null` too — the baseline already says zero.
 * @internal
 */
export function barMarks(
	values: (number | null)[][],
	band: BandScale,
	map: (value: number) => number,
	baseline: number,
	orientation: ChartOrientation = 'vertical',
): (BarMark | null)[][] {
	const seriesCount = Math.max(1, values.length)

	const thickness = Math.max(
		1,
		Math.min(BAR_MAX_WIDTH, (band.width - (seriesCount - 1) * MARK_GAP) / seriesCount),
	)

	const group = seriesCount * thickness + (seriesCount - 1) * MARK_GAP

	return values.map((series, seriesIndex) =>
		series.map((value, index) => {
			if (value === null || value === 0) return null

			const c0 = band.at(index) + (band.width - group) / 2 + seriesIndex * (thickness + MARK_GAP)

			const valuePos = map(value)

			if (valuePos === baseline) return null

			return barSpan(orientation, valuePos, baseline, c0, c0 + thickness, `${seriesIndex}:${index}`)
		}),
	)
}
