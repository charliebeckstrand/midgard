/**
 * Pure geometry for the {@link BarChart}: grouped bars as zero-baseline
 * spans rendered to one-end-rounded paths, independent of React and styling
 * so the mark math is unit-testable in isolation.
 */

import { BAR_END_RADIUS, BAR_MAX_WIDTH, MARK_GAP } from '../chart-constants'
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
	/** Whether the bar grows upward from the baseline (positive value). */
	up: boolean
}

/**
 * The rounded-end bar path from `baseline` to `value` y. The radius clamps
 * to the bar's own length and half-width so short or thin bars never invert;
 * `rect` + `rx` is off-spec here — it would round the baseline end too.
 *
 * @internal
 */
function barPath(x0: number, x1: number, valueY: number, baseline: number): string {
	const radius = Math.min(BAR_END_RADIUS, Math.abs(baseline - valueY), (x1 - x0) / 2)

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
): (BarMark | null)[][] {
	const seriesCount = Math.max(1, values.length)

	const width = Math.max(
		1,
		Math.min(BAR_MAX_WIDTH, (band.width - (seriesCount - 1) * MARK_GAP) / seriesCount),
	)

	const group = seriesCount * width + (seriesCount - 1) * MARK_GAP

	return values.map((series, seriesIndex) =>
		series.map((value, index) => {
			if (value === null || value === 0) return null

			const x0 = band.at(index) + (band.width - group) / 2 + seriesIndex * (width + MARK_GAP)

			const valueY = map(value)

			if (valueY === baseline) return null

			return {
				d: barPath(x0, x0 + width, valueY, baseline),
				x: x0,
				x1: x0 + width,
				top: Math.min(valueY, baseline),
				bottom: Math.max(valueY, baseline),
				key: `${seriesIndex}:${index}`,
				up: valueY < baseline,
			}
		}),
	)
}
