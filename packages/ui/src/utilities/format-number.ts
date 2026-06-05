// Cached Intl.NumberFormat instances. `Number.prototype.toLocaleString` and
// `new Intl.NumberFormat()` allocate a fresh formatter on every call, which
// becomes measurable in per-frame animations (Odometer) and grids with many
// numeric cells (PivotTable). Sharing module-level instances avoids that.
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
