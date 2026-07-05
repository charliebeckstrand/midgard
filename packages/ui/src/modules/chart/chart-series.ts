/**
 * Pure series plumbing shared by the chart kinds: slot-colour resolution,
 * numeric coercion, and the readout the tooltip and hidden table render.
 */

import { cn } from '../../core'
import { type ChartSeriesColor, k } from '../../recipes/kata/chart'
import { formatFraction, formatInteger } from '../../utilities'
import type { ChartSeries, DataKey } from './chart-schema'
import type { ChartReadout } from './types'

/** The em-dash a readout shows where a datum is non-finite. @internal */
export const READOUT_GAP = '—'

/** A series' mark classes, resolved from its slot or explicit colour. @internal */
export type SeriesPaint = (typeof k.series)[ChartSeriesColor]

/**
 * Resolves a series' colour: its explicit `color`, else its slot in the
 * fixed categorical order. Slots wrap past the eighth series — aggregate at
 * the call site before then.
 *
 * @internal
 */
export function seriesColor<T>(series: ChartSeries<T>, index: number): ChartSeriesColor {
	return series.color ?? k.order[index % k.order.length] ?? 'blue'
}

/** The mark classes for the series at `index`. @internal */
export function seriesPaint<T>(series: ChartSeries<T>, index: number): SeriesPaint {
	return k.series[seriesColor(series, index)]
}

/**
 * Reads one series' values off the rows: `Number(datum[key])`, with
 * non-finite results as `null` — a gap, never a collapsed scale.
 *
 * @internal
 */
export function seriesValues<T>(data: T[], key: DataKey<T>): (number | null)[] {
	return data.map((datum) => {
		const value = Number(datum[key])

		return Number.isFinite(value) ? value : null
	})
}

/**
 * The default value formatting: locale integers as integers, fractional
 * values to two places.
 *
 * @internal
 */
export function formatChartValue(value: number): string {
	return Number.isInteger(value) ? formatInteger(value) : formatFraction(value)
}

/** One series with everything the frame parts need to draw it. @internal */
export type SeriesMeta = {
	/** The series' position in the caller's list — slot colours and toggles key off it. */
	index: number
	label: string
	paint: SeriesPaint
	/** The resolved slot colour name — the texture tile keys off it, as the paint does. */
	color: ChartSeriesColor
	/** Swatch shape, mirroring the mark. */
	swatch: 'rect' | 'line'
	values: (number | null)[]
}

/**
 * Builds the readout behind the marks: category labels crossed with each
 * series' formatted values. `formatCategory` overrides the default `String`
 * coercion of each row's category — a time axis passes a date formatter so the
 * tooltip and table read the same dates the axis labels do.
 *
 * @internal
 */
export function chartReadout<T>(
	data: T[],
	xKey: DataKey<T>,
	metas: SeriesMeta[],
	format: (value: number) => string,
	formatCategory: (value: unknown) => string = String,
): ChartReadout {
	return {
		categories: data.map((datum) => formatCategory(datum[xKey])),
		rows: metas.map((meta) => ({
			label: meta.label,
			swatchClass: cn(meta.paint.text),
			swatch: meta.swatch,
			values: meta.values.map((value) => (value === null ? READOUT_GAP : format(value))),
		})),
	}
}
