import { getOrCompute } from './get-or-compute'

/**
 * Parametric value formatting: one `resolveFormat(spec)` seam the whole library
 * shares for numbers, currency, percentages, compact notation, and prefixed ids
 * (`INV-10`), over cached `Intl.NumberFormat` instances. The React binding that
 * feeds it ambient locale / currency defaults is `useFormat`
 * (`ui/providers/locale`); non-React callers (a chart's internal default, a
 * test) call `resolveFormat` directly. `format-number.ts` keeps one formatter
 * for each locale on top of it, for the Odometer and the PivotTable.
 */

/**
 * Locale and currency defaults a {@link FormatSpec} resolves against: the
 * ambient `LocaleConfig` subset `useFormat` supplies from `<LocaleProvider>`.
 *
 * @internal
 */
export type FormatDefaults = {
	/** BCP 47 locale tag; the runtime default when unset. */
	locale?: string
	/** ISO 4217 code the `currency` format falls back to (before `'USD'`). */
	currency?: string
	/** Base `Intl.NumberFormat` options each numeric format layers its own on top of. */
	numberFormat?: Intl.NumberFormatOptions
}

/** A numeric format backed by `Intl.NumberFormat`; `percent` reads a `0..1` share. */
type NumberFormatSpec = {
	/** Which numeric format to apply. */
	type: 'number' | 'integer' | 'currency' | 'percent' | 'compact'
	/** ISO 4217 code for `currency`; falls back to the ambient currency, then `'USD'`. */
	currency?: string
	/** Fraction-digit floor. */
	minimumFractionDigits?: number
	/** Fraction-digit ceiling. */
	maximumFractionDigits?: number
	/**
	 * Significant-digit ceiling. With `maximumFractionDigits` too, a value takes
	 * the ceiling that shows more of its digits: two fraction digits and six
	 * significant digits write `1.0842` and `0.0001` whole, and `48,213.46` to
	 * the cent.
	 */
	maximumSignificantDigits?: number
}

/** A prefixed identifier: `prefix` + `separator` + a zero-padded whole number, e.g. `INV-0042`. */
type IdFormatSpec = {
	type: 'id'
	/** Leading token, e.g. `'INV'`; omitted, the number formats alone. */
	prefix?: string
	/**
	 * Joins the prefix and the number.
	 * @defaultValue '-'
	 */
	separator?: string
	/** Zero-pad the number to this width: `4` renders `7` as `0007`. */
	pad?: number
}

/**
 * What to format a value as: a numeric `Intl` format (`number` / `integer` /
 * `currency` / `percent` / `compact`) or a prefixed `id`. The discriminant is
 * `type`.
 */
export type FormatSpec = NumberFormatSpec | IdFormatSpec

// A fresh `Intl.NumberFormat` per value is measurable in per-frame animation
// (Odometer) and numeric-cell-heavy grids (PivotTable, Grid), so instances are
// cached by their locale and resolved options.
const formatters = new Map<string, Intl.NumberFormat>()

/** The `Intl.NumberFormat` options a numeric spec resolves to over its defaults. */
function numericOptions(
	spec: NumberFormatSpec,
	defaults: FormatDefaults,
): Intl.NumberFormatOptions {
	const options: Intl.NumberFormatOptions = { ...defaults.numberFormat }

	switch (spec.type) {
		case 'integer':
			// Pin both bounds so an ambient `minimumFractionDigits` can't outrun the
			// zeroed ceiling and throw a RangeError.
			options.minimumFractionDigits = 0
			options.maximumFractionDigits = 0
			break
		case 'currency':
			options.style = 'currency'
			options.currency = spec.currency ?? defaults.currency ?? 'USD'
			break
		case 'percent':
			options.style = 'percent'
			break
		case 'compact':
			options.notation = 'compact'
			break
	}

	// A spec bound wins over the ambient bound on the other side: clamp that
	// bound so the two can't cross and throw a RangeError.
	if (spec.minimumFractionDigits !== undefined) {
		options.minimumFractionDigits = spec.minimumFractionDigits

		if (
			spec.maximumFractionDigits === undefined &&
			options.maximumFractionDigits !== undefined &&
			options.maximumFractionDigits < spec.minimumFractionDigits
		)
			options.maximumFractionDigits = spec.minimumFractionDigits
	}

	if (spec.maximumFractionDigits !== undefined) {
		options.maximumFractionDigits = spec.maximumFractionDigits

		if (
			spec.minimumFractionDigits === undefined &&
			options.minimumFractionDigits !== undefined &&
			options.minimumFractionDigits > spec.maximumFractionDigits
		)
			options.minimumFractionDigits = spec.maximumFractionDigits
	}

	if (spec.maximumSignificantDigits !== undefined) {
		options.maximumSignificantDigits = spec.maximumSignificantDigits

		// Without a priority, the significant ceiling alone would round the value.
		if (options.maximumFractionDigits !== undefined) options.roundingPriority = 'morePrecision'
	}

	return options
}

/** The cached `Intl.NumberFormat` for a locale and options pair, built once on first use. */
function numericFormatter(
	locale: string | undefined,
	options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
	// Sorted-key serialization: equivalent options built from differently
	// ordered `numberFormat` defaults must share one cached instance.
	const key = `${locale ?? ''}\u0000${JSON.stringify(options, Object.keys(options).sort())}`

	return getOrCompute(formatters, key, () => new Intl.NumberFormat(locale, options))
}

/**
 * Composes an `id` spec: `prefix` + `separator` + the sign and zero-padded whole number.
 * A non-finite value gets the `Intl` rendering, with no prefix and no padding.
 */
function formatId(value: number, spec: IdFormatSpec, locale: string | undefined): string {
	if (!Number.isFinite(value)) return numericFormatter(locale, {}).format(value)

	const whole = Math.trunc(value)

	const sign = whole < 0 ? '-' : ''

	const digits = Math.abs(whole).toString()

	const body = spec.pad ? digits.padStart(spec.pad, '0') : digits

	return spec.prefix ? `${spec.prefix}${spec.separator ?? '-'}${sign}${body}` : `${sign}${body}`
}

/**
 * Resolves a {@link FormatSpec} to a reusable `(value) => string` formatter,
 * binding the optional locale / currency {@link FormatDefaults}. Numeric specs
 * share a cached `Intl.NumberFormat`; the `id` spec composes its prefix and
 * zero-padded number. Prefer `useFormat` in components: it supplies the ambient
 * defaults for you.
 *
 * @remarks Non-finite values format as `Intl` renders them (`NaN`, `∞`); a
 * caller that wants a gap glyph guards before calling.
 */
export function resolveFormat(
	spec: FormatSpec,
	defaults: FormatDefaults = {},
): (value: number) => string {
	if (spec.type === 'id') return (value) => formatId(value, spec, defaults.locale)

	const formatter = numericFormatter(defaults.locale, numericOptions(spec, defaults))

	return (value) => formatter.format(value)
}
