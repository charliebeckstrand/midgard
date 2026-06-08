// Module-level cached `Intl.NumberFormat` instances. Fresh allocation per call
// is measurable in per-frame animations (Odometer) and numeric-cell-heavy
// grids (PivotTable).
const integerFormatter = new Intl.NumberFormat()
const fractionFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

/** Locale-format `value` with no fraction digits. */
export function formatInteger(value: number): string {
	return integerFormatter.format(value)
}

/** Locale-format `value` with up to two fraction digits. */
export function formatFraction(value: number): string {
	return fractionFormatter.format(value)
}
