/**
 * Pure series plumbing shared by the chart kinds: numeric coercion and the
 * readout the tooltip and hidden table render. Colour resolution lives in the
 * `chart-color` namespace.
 */

import { cn } from '../../../core'
import type { ChartColorSlot } from '../../../recipes/kata/chart'
import { formatFraction, formatInteger, resolveFormat } from '../../../utilities'
import { rawColor, textClass } from './chart-color/paint'
import type { ChartSeriesPaint } from './chart-color/palette'
import type { ChartValueAxisId, DataKey } from './chart-schema'
import type { ChartReadout } from './types'

/** The em-dash a readout shows where a datum is non-finite. @internal */
export const READOUT_GAP = '—'

/**
 * A series mark-group's classes: the legend/keyboard dim rides the group wrapper
 * so a mark's own inline motion opacity still composes over it. Shared by the
 * line and scatter mark renderers.
 *
 * @internal
 */
export function seriesGroupClass(dimmed: boolean | undefined): string {
	return cn('transition-opacity', dimmed && 'opacity-25')
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

/** The cached compact formatter behind {@link formatChartValueCompact}. @internal */
const compactFormatter = resolveFormat({ type: 'compact', maximumFractionDigits: 1 })

/**
 * The compact default the tick labels take in a narrow frame: locale compact
 * notation to one fraction digit (`48.2K`, `1.3M`), so the value gutter stays
 * cheap where a full-format label would crowd the plot. Only the tick labels
 * compact; the readout — tooltip and hidden table — keeps {@link
 * formatChartValue}'s full precision, and an explicit `formatValue` overrides
 * both. Small values render plainly (`820`, `8`), the same as the full default.
 *
 * @internal
 */
export function formatChartValueCompact(value: number): string {
	return compactFormatter(value)
}

/** One series with everything the frame parts need to draw it. @internal */
export type SeriesMeta = {
	/** The series' position in the caller's list — slot colours and toggles key off it. */
	index: number
	label: string
	paint: ChartSeriesPaint
	/** The resolved slot the texture tile keys off, or `null` for a raw colour. */
	slot: ChartColorSlot | null
	/** Swatch shape, mirroring the mark. */
	swatch: 'rect' | 'line'
	values: (number | null)[]
	/** The value axis the series reads against — its scale, formatter, and baseline. */
	axis: ChartValueAxisId
	/** Draw the connecting stroke dashed rather than solid; bars have none to dash. */
	dashed?: boolean
}

/**
 * Builds the readout behind the marks: category labels crossed with each
 * series' formatted values, each series formatted by its own axis's formatter
 * so a dual-axis tooltip and table read a currency beside a percent.
 * `formatCategory` overrides the default `String` coercion of each row's
 * category — a time axis passes a date formatter so the tooltip and table read
 * the same dates the axis labels do. The swatch takes the series' slot class
 * or, for a raw colour, an inline `currentColor`.
 *
 * @internal
 */
export function chartReadout<T>(
	data: T[],
	xKey: DataKey<T>,
	metas: SeriesMeta[],
	format: (value: number, axis: ChartValueAxisId) => string,
	formatCategory: (value: unknown) => string = String,
): ChartReadout {
	return {
		categories: data.map((datum) => formatCategory(datum[xKey])),
		rows: metas.map((meta) => ({
			index: meta.index,
			label: meta.label,
			swatchClass: textClass(meta.paint) ?? '',
			swatchColor: rawColor(meta.paint),
			swatch: meta.swatch,
			values: meta.values.map((value) => (value === null ? READOUT_GAP : format(value, meta.axis))),
		})),
	}
}
