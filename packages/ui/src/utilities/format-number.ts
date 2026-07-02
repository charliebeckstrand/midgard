// Module-level cached `Intl.NumberFormat` instances. Fresh allocation per call
// is measurable in per-frame animations (Odometer) and numeric-cell-heavy
// grids (PivotTable).
const integerFormatter = new Intl.NumberFormat()
const fractionFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const percentFormatter = new Intl.NumberFormat(undefined, {
	style: 'percent',
	maximumFractionDigits: 0,
})

/** Locale-format `value` with no fraction digits. */
export function formatInteger(value: number): string {
	return integerFormatter.format(value)
}

/** Locale-format `value` with up to two fraction digits. */
export function formatFraction(value: number): string {
	return fractionFormatter.format(value)
}

/** Locale-format a `0..1` share as a whole percent. */
export function formatPercent(share: number): string {
	return percentFormatter.format(share)
}
