import { resolveFormat } from './format'

// Module-level formatters. A fresh `Intl.NumberFormat` for each call costs
// measurable time in per-frame animations (Odometer) and in grids with many
// numeric cells (PivotTable). `resolveFormat` shares its cached instances.
const integerFormatter = resolveFormat({ type: 'integer' })
const fractionFormatter = resolveFormat({ type: 'number', maximumFractionDigits: 2 })
const percentFormatter = resolveFormat({ type: 'percent', maximumFractionDigits: 0 })

/** Locale-format `value` with no fraction digits. */
export function formatInteger(value: number): string {
	return integerFormatter(value)
}

/**
 * Locale-format `value` with up to two fraction digits. An integer prints with
 * no fraction, so this is also the default format for a value that can be an
 * integer or a fraction.
 */
export function formatFraction(value: number): string {
	return fractionFormatter(value)
}

/** Locale-format a `0..1` share as a whole percent. */
export function formatPercent(share: number): string {
	return percentFormatter(share)
}
