import { type FormatSpec, resolveFormat } from './format'
import { getOrCompute } from './get-or-compute'

/**
 * A formatter for `spec` per locale, built on first use and kept.
 *
 * A fresh `Intl.NumberFormat` for each call costs measurable time in per-frame
 * animations (Odometer) and in grids with many numeric cells (PivotTable). A
 * lookup by locale keeps each call to one map read.
 */
function perLocale(spec: FormatSpec): (locale: string | undefined) => (value: number) => string {
	const formatters = new Map<string | undefined, (value: number) => string>()

	return (locale) => getOrCompute(formatters, locale, () => resolveFormat(spec, { locale }))
}

/**
 * The formatter behind {@link formatInteger} for `locale`. The same locale gives the same
 * function, so a component can pass it where identity gates a memo.
 */
export const integerFormat = perLocale({ type: 'integer' })

/** The formatter behind {@link formatFraction} for `locale`, as for {@link integerFormat}. */
export const fractionFormat = perLocale({ type: 'number', maximumFractionDigits: 2 })

/** A `0..1` share as a whole percent for `locale`, as for {@link integerFormat}. */
export const percentFormat = perLocale({ type: 'percent', maximumFractionDigits: 0 })

/** Compact notation to one fraction digit (`48.2K`, `1.3M`) for `locale`, as for {@link integerFormat}. */
export const compactFormat = perLocale({ type: 'compact', maximumFractionDigits: 1 })

/**
 * Locale-format `value` with no fraction digits.
 *
 * @param locale - A BCP 47 tag, such as the `<LocaleProvider>` locale. Without it, the runtime
 * locale applies.
 */
export function formatInteger(value: number, locale?: string): string {
	return integerFormat(locale)(value)
}

/**
 * Locale-format `value` with up to two fraction digits. An integer prints with
 * no fraction, so this is also the default format for a value that can be an
 * integer or a fraction.
 *
 * @param locale - As for {@link formatInteger}.
 */
export function formatFraction(value: number, locale?: string): string {
	return fractionFormat(locale)(value)
}
