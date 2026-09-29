/**
 * The series of a cartesian chart: each series resolved to its meta, and the
 * scale that each visible series draws through. It also sets the order in which
 * the legend and the tooltip list the series. It holds no React, so the series
 * math is unit-testable in isolation.
 */

import { paintSlot, rawColor, textClass } from '../chart-color/paint'
import { seriesPaint } from '../chart-color/palette'
import type { ChartLegendItem } from '../chart-legend/legend'
import { legendVisible, type ResolvedLegend } from '../chart-legend/schema'
import type { ChartOrientation } from '../chart-orientation'
import type { LinearScale } from '../chart-scale'
import { type SeriesMeta, seriesValues } from '../chart-series'
import type { ChartSeries } from '../types'
import { stackAxisOf } from './stack'

/** Every series resolved to its meta: label, paint, swatch, values, and axis binding. @internal */
export function seriesMetas<T>(
	data: T[],
	series: ChartSeries<T>[],
	swatch: (series: ChartSeries<T>, index: number) => SeriesMeta['swatch'],
	stack: boolean,
): SeriesMeta[] {
	const stackAxis = stackAxisOf(series)

	return series.map((entry, index) => {
		const paint = seriesPaint(entry, index)

		return {
			index,
			label: entry.yName ?? entry.yKey,
			paint,
			slot: paintSlot(paint),
			swatch: swatch(entry, index),
			values: seriesValues(data, entry.yKey),
			// A stack reads as one part-to-whole column, so every series binds to the
			// stack's one axis rather than splitting segments across two domains.
			axis: stack ? stackAxis : (entry.axis ?? 'y'),
			dashed: entry.dashed,
		}
	})
}

/**
 * The content of the visible series that a readout reads, as one key: each
 * series' position, name, axis, swatch, field, and color. The values come from
 * the rows and the field, so the rows and this key together fix every cell.
 *
 * @internal
 */
export function readoutSeriesKey<T>(visible: SeriesMeta[], series: ChartSeries<T>[]): string {
	return visible
		.map((meta) => {
			const entry = series[meta.index]

			return [meta.index, meta.label, meta.axis, meta.swatch, entry?.yKey, entry?.color].join(
				'\u0001',
			)
		})
		.join('\u0000')
}

/** One visible series resolved to the scale and baseline it draws through. @internal */
export type DrawnSeries = {
	meta: SeriesMeta
	/** The series' own axis's scale — never `null`; an unresolved series drops out instead. */
	scale: LinearScale
	/** The zero position on that scale, where the series' bars grow from. */
	baseline: number
}

/**
 * The visible series paired with the scale and baseline each draws through. A
 * series reads its own axis's scale, the stack's one shared side when `stacked`.
 * One whose scale never resolved drops out, since it can take no marks. The mark
 * geometry, fills, and value labels all derive from this
 * one list so their indices stay aligned.
 *
 * @internal
 */
export function drawnSeries(chart: {
	visible: SeriesMeta[]
	yScale: LinearScale | null
	y2Scale: LinearScale | null
	baseline: number
	y2Baseline: number
}): DrawnSeries[] {
	// A stacked chart already carries one shared axis on every meta — `seriesMetas`
	// binds them all to the stack side — so each series reads its own `meta.axis`
	// whether stacked or grouped; no separate stack branch is needed.
	return chart.visible.flatMap((meta) => {
		const scale = meta.axis === 'y2' ? chart.y2Scale : chart.yScale

		const baseline = meta.axis === 'y2' ? chart.y2Baseline : chart.baseline

		return scale ? [{ meta, scale, baseline }] : []
	})
}

/**
 * Per-series projection callbacks for `barMarks`, read off the drawn list so
 * each bar series maps and grows through its own axis's scale. `fallback`
 * answers an index past the list, which the geometry never emits marks for.
 *
 * @internal
 */
export function barProjection(drawn: DrawnSeries[], fallback: number) {
	return {
		map: (value: number, index: number) => {
			const entry = drawn[index]

			return entry ? entry.scale.map(value) : value
		},
		baseline: (index: number) => drawn[index]?.baseline ?? fallback,
	}
}

/**
 * A series' latest finite value — its position at the right edge, where the
 * eye reads a line's order. A trailing gap falls back to the last real value;
 * an all-null series has none and sinks with negative infinity.
 *
 * @internal
 */
function latestValue(values: (number | null)[]): number {
	return values.findLast((value) => value != null) ?? Number.NEGATIVE_INFINITY
}

/**
 * Orders two series by their latest value, largest first — the legend's
 * visible top-to-bottom order when a chart opts into
 * {@link CartesianConfig.legendByValue}. Equal or all-null series fall back to
 * the caller's order, so the sort stays stable and never returns `NaN`.
 *
 * @internal
 */
function byLatestValue(a: SeriesMeta, b: SeriesMeta): number {
	return latestValue(b.values) - latestValue(a.values) || a.index - b.index
}

/**
 * The metas in legend order: sorted into the marks' visible value order when
 * `byValue` is set, else the caller's series order untouched. The sort runs on
 * a copy, so the list the scales and marks read keeps its series order.
 *
 * @internal
 */
function orderLegend(metas: SeriesMeta[], byValue: boolean | undefined): SeriesMeta[] {
	return byValue ? [...metas].sort(byLatestValue) : metas
}

/**
 * The series indices the tooltip lists its rows in, so the hover readout reads
 * top-to-bottom in the marks' own visible order. The readout itself stays in the
 * caller's series order for the hidden data table; this reorders only the
 * display. A vertical stack piles the first series at the bottom, so its rows
 * reverse and the top segment reads first. A horizontal stack runs first-to-last
 * left to right, and keeps the series order. Off a stack the rows take the
 * legend's own {@link orderLegend} order. Overlapping lines therefore read in
 * their drawn value order, and the tooltip agrees with the legend.
 *
 * @internal
 */
export function orderReadout(
	visible: SeriesMeta[],
	stacked: boolean,
	orientation: ChartOrientation,
	byValue: boolean | undefined,
): number[] {
	if (stacked && orientation === 'vertical') return visible.map((meta) => meta.index).reverse()

	return orderLegend(visible, byValue).map((meta) => meta.index)
}

/** The fields of a series that its legend entry reads. @internal */
type LegendSeries = Pick<SeriesMeta, 'index' | 'label' | 'paint' | 'swatch' | 'dashed'>

/**
 * One series' legend entry: its label, and a swatch in its paint. A palette
 * slot also names the texture tile, so a textured swatch mirrors the mark. A
 * raw color carries no tile, and inks through `swatchColor`. The cartesian
 * charts and the scatter share it.
 *
 * @internal
 */
export function legendItemOf(meta: LegendSeries): ChartLegendItem {
	return {
		index: meta.index,
		label: meta.label,
		swatchClass: textClass(meta.paint) ?? '',
		swatchColor: rawColor(meta.paint),
		swatch: meta.swatch,
		dashed: meta.dashed,
		color: paintSlot(meta.paint) ?? undefined,
	}
}

/**
 * The legend entries: on request, or by default once a second series needs
 * telling apart. Opted into `byValue`, the switches list in the marks' visible
 * order, each series by its latest value. Every entry keeps its own index, so
 * the reorder is display-only and a toggle still finds its series.
 *
 * @internal
 */
export function cartesianLegendItems(
	metas: SeriesMeta[],
	legend: ResolvedLegend['value'],
	byValue: boolean | undefined,
): ChartLegendItem[] | null {
	if (!legendVisible(legend, metas.length)) return null

	return orderLegend(metas, byValue).map(legendItemOf)
}
