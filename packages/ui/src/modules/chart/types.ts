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
