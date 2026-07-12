/**
 * The categorical palette: which colour a series draws in. A series takes its
 * explicit `color` when set — a palette slot or a raw CSS colour — else its
 * slot in the fixed, CVD-validated categorical order, cycling past the eighth
 * series. The order lives here once, so a colourless series, a scatter point,
 * and a pie slice all read the same slot for the same index. Resolution ends in
 * a {@link ChartSeriesPaint}, the value the marks and swatches paint through.
 *
 * The ordinal half of the chart's colour system; its sequential counterpart —
 * continuous range/bin colour — would join as `chart-color/range`.
 */

import { type ChartColorSlot, k } from '../../../../recipes/kata/chart'
import type { ChartSeries } from '../types'
import { type ChartColor, type ChartPaint, resolvePaint } from './paint'

/**
 * A series' colour: a named palette slot or a raw CSS colour. The
 * series-domain name for the generic {@link ChartColor}; other coloured
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
 * Resolves a series' colour: its explicit `color` — a palette slot or a raw CSS
 * colour — else its slot in the fixed categorical order.
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
