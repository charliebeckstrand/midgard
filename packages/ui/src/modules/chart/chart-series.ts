/**
 * Pure series plumbing shared by the chart kinds: colour resolution, numeric
 * coercion, and the readout the tooltip and hidden table render.
 */

import { cn } from '../../core'
import { type ChartSeriesColor, k } from '../../recipes/kata/chart'
import { formatFraction, formatInteger, resolveFormat } from '../../utilities'
import type { ChartSeries, ChartValueAxisId, DataKey } from './chart-schema'
import type { ChartReadout } from './types'

/** The em-dash a readout shows where a datum is non-finite. @internal */
export const READOUT_GAP = '—'

/** The mark classes for one palette slot — `stroke` / `fill` / `text` / `onFill`. @internal */
export type SlotPaint = (typeof k.series)[ChartSeriesColor]

/**
 * A series' resolved paint, mirroring the map module's `MapReadoutPaint`: a
 * palette slot carries the CVD-validated class lists, applied through
 * `className`; a raw CSS colour (a hex, `oklch()`, or any value CSS accepts)
 * carries one inline value, applied as an SVG paint attribute (`fill` / `stroke`)
 * or the swatch's `currentColor` and absent for slots. One union so every mark,
 * swatch, and label paints a slot and a raw colour the same way — the chart
 * analogue of how a {@link ChartReferenceLine} already resolves.
 *
 * @internal
 */
export type SeriesPaint =
	| ({ kind: 'slot'; slot: ChartSeriesColor } & Pick<SlotPaint, 'stroke' | 'fill' | 'text'>)
	| { kind: 'raw'; color: string }

/**
 * Whether a colour names a palette slot — rendered through the CVD-safe slot
 * classes — rather than a raw CSS colour applied inline. `Object.hasOwn` so a
 * property name off `Object.prototype` (`'constructor'`, `'toString'`) can't pose
 * as a slot. Shared by the series marks and the reference lines.
 *
 * @internal
 */
export function isSeriesSlot(color: string): color is ChartSeriesColor {
	return Object.hasOwn(k.series, color)
}

/**
 * Resolves a series' colour: its explicit `color` — a palette slot or a raw CSS
 * colour — else its slot in the fixed categorical order. Slots wrap past the
 * eighth series — aggregate at the call site before then.
 *
 * @internal
 */
export function seriesColor<T>(
	series: ChartSeries<T>,
	index: number,
): ChartSeriesColor | (string & {}) {
	return series.color ?? k.order[index % k.order.length] ?? 'blue'
}

/**
 * Resolves a mark colour to its paint: a palette slot to its slot classes, any
 * other string to a raw CSS colour applied inline.
 *
 * @internal
 */
export function paintFor(color: ChartSeriesColor | (string & {})): SeriesPaint {
	if (isSeriesSlot(color)) {
		const { stroke, fill, text } = k.series[color]

		return { kind: 'slot', slot: color, stroke, fill, text }
	}

	return { kind: 'raw', color }
}

/** The resolved paint for the series at `index`. @internal */
export function seriesPaint<T>(series: ChartSeries<T>, index: number): SeriesPaint {
	return paintFor(seriesColor(series, index))
}

/** A mark's fill class for a slot, or `undefined` for a raw colour, which fills through {@link rawColor}. @internal */
export function fillClass(paint: SeriesPaint): string | undefined {
	return paint.kind === 'slot' ? cn(paint.fill) : undefined
}

/** A mark's stroke class for a slot, or `undefined` for a raw colour, which strokes through {@link rawColor}. @internal */
export function strokeClass(paint: SeriesPaint): string | undefined {
	return paint.kind === 'slot' ? cn(paint.stroke) : undefined
}

/** An HTML swatch's `currentColor` class for a slot, or `undefined` for a raw colour, which inks through {@link rawColor}. @internal */
export function textClass(paint: SeriesPaint): string | undefined {
	return paint.kind === 'slot' ? cn(paint.text) : undefined
}

/**
 * A raw series colour for an inline SVG `fill` / `stroke` attribute (or a swatch's
 * `currentColor`), or `undefined` for a slot — a CSS class always wins over the
 * presentation attribute, so a slot paints through its class and the attribute is
 * simply omitted.
 *
 * @internal
 */
export function rawColor(paint: SeriesPaint): string | undefined {
	return paint.kind === 'raw' ? paint.color : undefined
}

/** The palette slot the texture tile keys off, or `null` for a raw colour, which takes no tile. @internal */
export function paintSlot(paint: SeriesPaint): ChartSeriesColor | null {
	return paint.kind === 'slot' ? paint.slot : null
}

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
	paint: SeriesPaint
	/** The resolved slot the texture tile keys off, or `null` for a raw colour. */
	slot: ChartSeriesColor | null
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
