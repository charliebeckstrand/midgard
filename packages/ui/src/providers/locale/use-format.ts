'use client'

import { useMemo } from 'react'
import { type FormatSpec, resolveFormat } from '../../utilities'
import { useLocale } from './context'

export type { FormatSpec } from '../../utilities'

/**
 * Resolves a {@link FormatSpec} to a memoized `(value) => string` formatter,
 * folding in the ambient `<LocaleProvider>` locale, currency, and number-format
 * defaults so `useFormat({ type: 'currency' })` renders the right currency with
 * no per-call wiring. Drops straight into any surface that takes a value
 * formatter — a chart's `formatValue`, a grid column's `cell`, an odometer's
 * `format`.
 *
 * @remarks The formatter is stable across renders for a given spec and ambient
 * locale, so it is safe to pass where identity gates a memo. For a non-React
 * caller, `resolveFormat` (`ui` internal) is the underlying seam.
 * @example
 * ```tsx
 * const money = useFormat({ type: 'currency' })
 * const ref = useFormat({ type: 'id', prefix: 'INV', pad: 4 })
 * <BarChart aria-label="Budget" data={data} series={series} formatValue={money} />
 * ref(42) // 'INV-0042'
 * ```
 */
export function useFormat(spec: FormatSpec): (value: number) => string {
	const { locale, currency, numberFormat } = useLocale()

	// Serialize the spec so an inline `useFormat({ type: 'currency' })` literal —
	// a new object each render — reuses one formatter, and every reactive input
	// stays in the dependency list.
	const key = JSON.stringify(spec)

	return useMemo(
		() => resolveFormat(JSON.parse(key) as FormatSpec, { locale, currency, numberFormat }),
		[key, locale, currency, numberFormat],
	)
}
