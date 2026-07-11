/**
 * The Paint value model: what a resolved chart colour *is* and how it applies
 * to a mark, swatch, or label — independent of what's being coloured. A colour
 * resolves to one of two kinds: a palette *slot*, carrying the CVD-validated
 * class lists applied through `className`; or a *raw* CSS colour (a hex,
 * `oklch()`, or any value CSS accepts), carrying one inline value applied as an
 * SVG paint attribute or a swatch's `currentColor`. Every mark, swatch, and
 * label paints both the same way by reading a {@link ChartPaint} through the
 * projections below.
 *
 * This is the categorical half of the chart's colour system. Continuous colour
 * — the range/bin scale heatmap and choropleth share — is the sequential
 * counterpart that would join this namespace as `chart-color/range` (today it
 * lives in `utilities/color-scale`); both would speak the same Paint value.
 */

import { cn } from '../../../../core'
import { type ChartColorSlot, k } from '../../../../recipes/kata/chart'

/** The mark classes for one palette slot — `stroke` / `fill` / `text` / `onFill`. @internal */
export type SlotPaint = (typeof k.series)[ChartColorSlot]

/**
 * A chart colour: a named palette slot rendered through the CVD-validated slot
 * classes, or a raw CSS colour (a hex, `oklch()`, or any value CSS accepts)
 * applied inline. The generic input the whole colour system resolves from —
 * series build {@link ChartSeriesColor} on it, and other coloured elements can
 * do the same.
 *
 * @internal
 */
export type ChartColor = ChartColorSlot | (string & {})

/**
 * A resolved paint, mirroring the map module's `MapReadoutPaint`: a palette
 * slot carries the CVD-validated class lists, applied through `className`; a
 * raw CSS colour carries one inline value, applied as an SVG paint attribute
 * (`fill` / `stroke`) or the swatch's `currentColor` and absent for slots. One
 * union so every mark, swatch, and label paints a slot and a raw colour the
 * same way — the chart analogue of how a {@link ChartReferenceLine} already
 * resolves.
 *
 * @internal
 */
export type ChartPaint =
	| ({ kind: 'slot'; slot: ChartColorSlot } & Pick<SlotPaint, 'stroke' | 'fill' | 'text'>)
	| { kind: 'raw'; color: string }

/**
 * Whether a colour names a palette slot — rendered through the CVD-safe slot
 * classes — rather than a raw CSS colour applied inline. `Object.hasOwn` so a
 * property name off `Object.prototype` (`'constructor'`, `'toString'`) can't pose
 * as a slot. Shared by the series marks and the reference lines.
 *
 * @internal
 */
export function isColorSlot(color: string): color is ChartColorSlot {
	return Object.hasOwn(k.series, color)
}

/**
 * Resolves a chart colour to its paint: a palette slot to its slot classes, any
 * other string to a raw CSS colour applied inline.
 *
 * @internal
 */
export function resolvePaint(color: ChartColor): ChartPaint {
	if (isColorSlot(color)) {
		const { stroke, fill, text } = k.series[color]

		return { kind: 'slot', slot: color, stroke, fill, text }
	}

	return { kind: 'raw', color }
}

/** A mark's fill class for a slot, or `undefined` for a raw colour, which fills through {@link rawColor}. @internal */
export function fillClass(paint: ChartPaint): string | undefined {
	return paint.kind === 'slot' ? cn(paint.fill) : undefined
}

/** A mark's stroke class for a slot, or `undefined` for a raw colour, which strokes through {@link rawColor}. @internal */
export function strokeClass(paint: ChartPaint): string | undefined {
	return paint.kind === 'slot' ? cn(paint.stroke) : undefined
}

/** An HTML swatch's `currentColor` class for a slot, or `undefined` for a raw colour, which inks through {@link rawColor}. @internal */
export function textClass(paint: ChartPaint): string | undefined {
	return paint.kind === 'slot' ? cn(paint.text) : undefined
}

/**
 * A raw colour for an inline SVG `fill` / `stroke` attribute (or a swatch's
 * `currentColor`), or `undefined` for a slot — a CSS class always wins over the
 * presentation attribute, so a slot paints through its class and the attribute is
 * simply omitted.
 *
 * @internal
 */
export function rawColor(paint: ChartPaint): string | undefined {
	return paint.kind === 'raw' ? paint.color : undefined
}

/** The palette slot the texture tile keys off, or `null` for a raw colour, which takes no tile. @internal */
export function paintSlot(paint: ChartPaint): ChartColorSlot | null {
	return paint.kind === 'slot' ? paint.slot : null
}
