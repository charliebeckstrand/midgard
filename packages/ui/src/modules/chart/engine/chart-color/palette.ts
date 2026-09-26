/**
 * The categorical palette: which color a series draws in. A series takes its
 * explicit `color` when set: a palette slot or a raw CSS color. Without one it
 * takes its slot in the fixed, CVD-validated categorical order, cycling past
 * the eighth series. The order lives here once, so a colorless series, a scatter point,
 * and a pie slice all read the same slot for the same index. Resolution ends in
 * a {@link ChartSeriesPaint}, the value the marks and swatches paint through.
 *
 * The ordinal half of the chart's color system; its sequential counterpart —
 * continuous range/bin color — would join as `chart-color/range`.
 */

import { type ChartColorSlot, k } from '../../../../recipes/kata/chart'
import type { ChartSeries } from '../types'
import { type ChartColor, type ChartPaint, resolvePaint } from './paint'

/**
 * A series' color: a named palette slot or a raw CSS color. The
 * series-domain name for the generic {@link ChartColor}; other colored
 * elements (labels, annotations) can name their own alias the same way.
 */
export type ChartSeriesColor = ChartColor

/** A series' resolved paint: {@link ChartPaint} as it applies to a series. @internal */
export type ChartSeriesPaint = ChartPaint

/**
 * The palette slot at a series index in the fixed categorical order, wrapping
 * past the eighth series — aggregate at the call site before then.
 *
 * @internal
 */
export function paletteSlot(index: number): ChartColorSlot {
	return k.order[index % k.order.length] ?? 'blue'
}

/**
 * The palette slot of each category in `labels`. Without `categories`, a label
 * takes the slot of its position, the default order. With `categories`, a label
 * takes the slot of its place in that list. A filter that removes a category
 * therefore never moves the colors of the rest. A label outside the list takes
 * a slot after the listed ones.
 *
 * @internal
 */
export function categorySlots(
	labels: readonly string[],
	categories: readonly string[] | undefined,
): ChartColorSlot[] {
	if (categories === undefined || categories.length === 0) {
		return labels.map((_, index) => paletteSlot(index))
	}

	const place = new Map(categories.map((category, index) => [category, index]))

	// An unlisted label counts only among the unlisted ones. Its position among
	// all labels skips past slots and wraps onto a listed category's color.
	let unlisted = 0

	return labels.map((label) => paletteSlot(place.get(label) ?? categories.length + unlisted++))
}

/**
 * Resolves a series' color: its explicit `color` — a palette slot or a raw CSS
 * color — else its slot in the fixed categorical order.
 *
 * @internal
 */
export function seriesColor<T>(series: ChartSeries<T>, index: number): ChartSeriesColor {
	return series.color ?? paletteSlot(index)
}

/** The resolved paint for the series at `index`. @internal */
export function seriesPaint<T>(series: ChartSeries<T>, index: number): ChartSeriesPaint {
	return resolvePaint(seriesColor(series, index))
}
