/**
 * Pure series plumbing shared by the chart kinds: numeric coercion and the
 * readout the tooltip and hidden table render. Color resolution lives in the
 * `chart-color` namespace.
 */

import { cn } from '../../../core'
import type { ChartColorSlot } from '../../../recipes/kata/chart'
import { parseNumeric } from '../../../utilities'
import type { ChartValueAxisId } from './chart-axes/schema'
import { rawColor, textClass } from './chart-color/paint'
import type { ChartSeriesPaint } from './chart-color/palette'
import type { ChartReadout, DataKey } from './types'

/** The em-dash a readout shows where a datum is non-finite. @internal */
export const READOUT_GAP = '—'

/** The classes of a mark at full strength. @internal */
const LIT_CLASS = cn('transition-opacity')

/** The classes of a mark that recedes behind an emphasis. @internal */
const RECEDED_CLASS = cn('transition-opacity', 'opacity-25')

/**
 * The recede classes of a mark: a series group, a slice, a bar, a heatmap cell,
 * the marks layer, or a tooltip row. The legend and keyboard dim rides the
 * group wrapper of an animated mark, so the inline motion opacity of the mark
 * still composes over it. This is the one home of the recede class.
 *
 * @internal
 */
export function seriesGroupClass(dimmed: boolean | undefined): string {
	return dimmed ? RECEDED_CLASS : LIT_CLASS
}

/**
 * The readout text of one value: the value in `format`, or {@link READOUT_GAP}
 * where the datum is a gap.
 *
 * @internal
 */
export function readoutCell(
	value: number | null | undefined,
	format: (value: number) => string,
): string {
	return value == null ? READOUT_GAP : format(value)
}

/**
 * Reads one series' values off the rows through {@link parseNumeric}. A value
 * that does not parse is `null`: a gap, never a collapsed scale. A `null`,
 * blank, or missing value is therefore a gap and not a zero.
 *
 * @internal
 */
export function seriesValues<T>(data: T[], key: DataKey<T>): (number | null)[] {
	return data.map((datum) => parseNumeric(datum[key]))
}

/** One series with everything the frame parts need to draw it. @internal */
export type SeriesMeta = {
	/** The series' position in the caller's list — slot colors and toggles key off it. */
	index: number
	label: string
	paint: ChartSeriesPaint
	/** The resolved slot the texture tile keys off, or `null` for a raw color. */
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
 * series' formatted values. Each series is formatted by its own axis's
 * formatter, so a dual-axis tooltip and table read a currency beside a percent.
 * `formatCategory` overrides the default `String` coercion of each row's
 * category. A time axis passes a date formatter, so the tooltip and table read
 * the same dates the axis labels do. The swatch takes the series' slot class
 * or, for a raw color, an inline `currentColor`.
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
		rows: metas.map((meta) => {
			const formatValue = (value: number) => format(value, meta.axis)

			return {
				index: meta.index,
				label: meta.label,
				swatchClass: textClass(meta.paint) ?? '',
				swatchColor: rawColor(meta.paint),
				swatch: meta.swatch,
				values: meta.values.map((value) => readoutCell(value, formatValue)),
			}
		}),
	}
}

/**
 * The data indices whose raw category sits in `selected`, compared as text, or
 * `null` when nothing is selected. A category that no datum carries selects
 * nothing.
 *
 * @internal
 */
export function selectedIndices(
	categories: readonly unknown[],
	selected: readonly string[] | undefined,
): ReadonlySet<number> | null {
	if (selected === undefined || selected.length === 0) return null

	const wanted = new Set(selected)

	const indices = new Set<number>()

	categories.forEach((category, index) => {
		if (wanted.has(String(category ?? ''))) indices.add(index)
	})

	return indices
}
