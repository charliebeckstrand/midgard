/**
 * Internal rendering types the chart frame derives from the data — not part of
 * the public schema. The data structure and shared props charts accept live in
 * `chart-schema.ts`.
 */

/**
 * One readout row: a series with its swatch and the pre-formatted value per
 * category (an em-dash where the datum is non-finite).
 *
 * @internal
 */
export type ChartReadoutRow = {
	/**
	 * The series' index in the caller's list, so the tooltip can tell the
	 * emphasised row from the rest; absent on readouts whose rows aren't series —
	 * a pie's slices, a heatmap's rows — where no row is singled out.
	 */
	index?: number
	label: string
	/** Class carrying the series colour on `currentColor`; empty for a raw colour, which inks inline. */
	swatchClass: string
	/** A raw series colour inked inline on the swatch's `currentColor`; unset for a palette slot. */
	swatchColor?: string
	/** Per-category swatch overrides — pie slices, where the colour follows the category. */
	swatchClasses?: string[]
	/** Swatch shape, mirroring the mark. */
	swatch: 'rect' | 'line'
	/** Formatted value per category index. */
	values: string[]
}

/**
 * The values a chart exposes off the marks: category labels crossed with one
 * row per series. The tooltip reads one column on hover; the visually-hidden
 * table renders all of it for assistive tech, so no value is gated behind a
 * pointer.
 *
 * @internal
 */
export type ChartReadout = {
	categories: string[]
	rows: ChartReadoutRow[]
}

/**
 * A chart's readout as a cached thunk ({@link once}), not a value: building
 * one formats every category × series cell through `Intl`, which at dense
 * sizes costs more than drawing the marks — so nothing on the mount-critical
 * render may materialize it. The first consumer that needs the values — a
 * hover's tooltip, the deferred data table, a CSV export — calls the thunk
 * off that path and every later reader shares the cache. A chart that can
 * cheaply tell it has no readout passes `null` in its place, so presence
 * still gates the tooltip and table without a build.
 *
 * @internal
 */
export type ChartReadoutSource = () => ChartReadout | null
