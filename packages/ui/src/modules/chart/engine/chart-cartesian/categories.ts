/**
 * The categories of a cartesian chart: the band-axis labels, their raw forms,
 * and the readout formatter. It holds no React, so the label resolution is
 * unit-testable in isolation.
 */

import { dateCategoryFormat, timeCategory } from '../chart-time'

/** The category labels, their raw forms, and the readout formatter. @internal */
type ResolvedCategories = {
	/** The band-axis labels — formatted when a formatter resolved, else raw. */
	categories: string[]
	/** The raw `String`-coerced values, which the click callback keys off. */
	rawCategories: string[]
	/** The tooltip and data table category formatter; `undefined` falls back to `String`. */
	readoutCategory: ((value: unknown) => string) | undefined
}

/**
 * Resolves the band axis's category labels and readout formatter from the raw
 * `xKey` values. An explicit `formatCategory` wins for both the labels and the
 * readout. With none set, a plain axis whose every value parses as a date
 * normalizes itself to the locale's numeric month/day order (see
 * {@link dateCategoryFormat}). A time axis leaves its labels to its own calendar
 * ticks, and formats only its readout. The formatter resolves once over every
 * value, so a whole-dataset decision — the date normalization's year elision —
 * reads the same for every label.
 *
 * @param locale - BCP 47 tag from `<LocaleProvider>`; `undefined` falls back to
 * the runtime locale, which is what a chart outside a provider gets.
 * @internal
 */
export function resolveCategories<T>(
	data: T[],
	xKey: (keyof T & string) | undefined,
	timeAxis: boolean,
	formatCategory: ((value: unknown) => string) | undefined,
	locale: string | undefined,
): ResolvedCategories {
	const rawValues = xKey ? data.map((datum) => datum[xKey]) : []

	const categoryFormat =
		formatCategory ??
		(timeAxis ? undefined : (dateCategoryFormat(rawValues, undefined, locale) ?? undefined))

	const rawCategories = rawValues.map(String)

	return {
		// Without a formatter the labels *are* the raw categories; one pass, one array.
		categories: categoryFormat ? rawValues.map(categoryFormat) : rawCategories,
		rawCategories,
		readoutCategory: categoryFormat ?? (timeAxis ? timeCategory(locale) : undefined),
	}
}
