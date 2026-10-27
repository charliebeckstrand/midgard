import { type FormatSpec, resolveFormat } from './format'
import { getOrCompute } from './get-or-compute'

/**
 * A formatter for `spec` per locale, built on first use and kept.
 *
 * {@link resolveFormat} caches the `Intl.NumberFormat`, but each call builds a
 * cache key and a new function. A lookup by locale keeps each call to one map
 * read, and gives the same function for the same locale, so a memo that reads
 * it stays valid.
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

/**
 * A `0..1` share as a whole percent for `locale`, as for {@link integerFormat}. A
 * share under one percent keeps one significant digit (`0.4%`, `0.01%`), so a
 * share that is not zero never reads `0%`.
 */
export const percentFormat = perLocale({
	type: 'percent',
	maximumFractionDigits: 0,
	maximumSignificantDigits: 1,
})

/**
 * A chart value in a tooltip or a data table for `locale`, as for
 * {@link integerFormat}: two fraction digits, or six significant digits where
 * they show more. A large value keeps the cents (`48,213.46`), and a small or
 * fine value keeps its digits (`0.0001`, `1.0842`), where two fraction digits
 * alone would write `0` and `1.08`.
 */
export const readoutFormat = perLocale({
	type: 'number',
	maximumFractionDigits: 2,
	maximumSignificantDigits: 6,
})

/**
 * An axis tick for `locale`, as for {@link integerFormat}, with every fraction
 * digit that the tick holds. A tick is a whole multiple of a 1, 2, or 5 step, so
 * the label shows the digits of the step: ticks `0.0005` apart write `1.0845`,
 * `1.085`, and `1.0855`, where a fixed ceiling of two would write `1.08` and
 * `1.09` again and again.
 */
export const tickFormat = perLocale({ type: 'number', maximumFractionDigits: 20 })

/**
 * An axis tick in compact notation (`48.2K`, `1.25M`) for `locale`, as for
 * {@link tickFormat}: it keeps every fraction digit of the tick, in the unit
 * that the notation chooses.
 */
export const compactTickFormat = perLocale({ type: 'compact', maximumFractionDigits: 20 })

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
