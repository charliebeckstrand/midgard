'use client'

import { useState } from 'react'
import { useFormattedInput } from '../../hooks/use-formatted-input'
import { useLocale } from '../../providers/locale'
import { useFormValue } from '../form/use-form-value'
import { Input, type InputProps } from '../input'
import { formatEditing, isMeaningful, parseEditing } from './currency-input-utilities'
import { useCurrencyInputFormatting } from './use-currency-input-formatting'

export type CurrencyInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: number | null
	defaultValue?: number
	onValueChange?: (value: number | undefined) => void
	/** ISO 4217 currency code. Falls back to `<LocaleProvider currency>`, then `USD`. */
	currency?: string
	/** BCP 47 locale tag. Falls back to `<LocaleProvider locale>`, then the runtime default. */
	locale?: string
	/** Override the number of fraction digits. Defaults to the currency's standard. */
	precision?: number
}

/**
 * Numeric Input that formats its value as localized currency. Emits a `number`
 * via `onValueChange` while displaying grouped digits and the currency symbol,
 * and binds to an enclosing Form field by `name`. Resolves `currency` and
 * `locale` from props, then `<LocaleProvider>`, then runtime defaults.
 */
export function CurrencyInput({
	value,
	defaultValue,
	onValueChange,
	currency,
	locale,
	precision,
	prefix,
	suffix,
	onFocus,
	onBlur,
	onKeyDown,
	name,
	ref,
	...props
}: CurrencyInputProps) {
	const ambient = useLocale()

	const resolvedCurrency = currency ?? ambient.currency ?? 'USD'

	const resolvedLocale = locale ?? ambient.locale

	const {
		value: num,
		setValue: setNum,
		setTouched,
	} = useFormValue<number>(name, { value, defaultValue, onValueChange })

	const { displayFormatter, symbol, symbolIsPrefix, group, decimal, maxFractionDigits } =
		useCurrencyInputFormatting({
			currency: resolvedCurrency,
			locale: resolvedLocale,
			precision,
		})

	const [editingText, setEditingText] = useState<string | null>(null)

	const text = editingText ?? (num === undefined ? '' : displayFormatter.format(num))

	const { ref: setRefs, reformat } = useFormattedInput({
		format: (raw) => formatEditing(raw, resolvedLocale, decimal, maxFractionDigits),
		meaningful: (c) => isMeaningful(c, decimal),
		ref,
	})

	return (
		<Input
			ref={setRefs}
			data-slot="currency-input"
			type="text"
			inputMode="decimal"
			prefix={prefix ?? (symbolIsPrefix ? symbol : undefined)}
			suffix={suffix ?? (symbolIsPrefix ? undefined : symbol)}
			className="tabular-nums"
			name={name}
			value={text}
			onFocus={onFocus}
			onKeyDown={(e) => {
				onKeyDown?.(e)

				if (!e.defaultPrevented && e.key === 'Enter') {
					e.currentTarget.blur()
				}
			}}
			onChange={(e) => {
				const formatted = reformat(e)

				setEditingText(formatted)

				setNum(parseEditing(formatted, group, decimal))
			}}
			onBlur={(e) => {
				if (editingText !== null) {
					const parsed = parseEditing(editingText, group, decimal)

					if (parsed !== num) setNum(parsed)

					setEditingText(null)
				}

				setTouched()

				onBlur?.(e)
			}}
			{...props}
		/>
	)
}
