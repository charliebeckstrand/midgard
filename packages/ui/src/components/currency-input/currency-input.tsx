'use client'

import { useState } from 'react'
import { useControllable, usePendingCaret } from '../../hooks'
import { useLocale } from '../../providers/locale'
import { Input, type InputProps } from '../input'
import {
	countMeaningful,
	cursorForCount,
	formatEditing,
	parseEditing,
} from './currency-input-utilities'
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
	ref,
	...props
}: CurrencyInputProps) {
	const ambient = useLocale()

	const resolvedCurrency = currency ?? ambient.currency ?? 'USD'
	const resolvedLocale = locale ?? ambient.locale

	const [num, setNum] = useControllable<number>({
		value,
		defaultValue,
		onValueChange,
	})

	const { displayFormatter, symbol, symbolIsPrefix, group, decimal, maxFractionDigits } =
		useCurrencyInputFormatting({
			currency: resolvedCurrency,
			locale: resolvedLocale,
			precision,
		})

	const [editingText, setEditingText] = useState<string | null>(null)

	const text = editingText ?? (num === undefined ? '' : displayFormatter.format(num))

	const { ref: setRefs, setCaret } = usePendingCaret(ref)

	return (
		<Input
			ref={setRefs}
			type="text"
			inputMode="decimal"
			prefix={prefix ?? (symbolIsPrefix ? symbol : undefined)}
			suffix={suffix ?? (symbolIsPrefix ? undefined : symbol)}
			className="tabular-nums"
			value={text}
			onFocus={onFocus}
			onKeyDown={(e) => {
				onKeyDown?.(e)

				if (!e.defaultPrevented && e.key === 'Enter') {
					e.currentTarget.blur()
				}
			}}
			onChange={(e) => {
				const raw = e.target.value

				const cursor = e.target.selectionStart ?? raw.length

				const meaningfulBefore = countMeaningful(raw, cursor, decimal)

				const formatted = formatEditing(raw, resolvedLocale, decimal, maxFractionDigits)

				setCaret(cursorForCount(formatted, meaningfulBefore, decimal))

				setEditingText(formatted)

				setNum(parseEditing(formatted, group, decimal))
			}}
			onBlur={(e) => {
				if (editingText !== null) {
					const parsed = parseEditing(editingText, group, decimal)

					if (parsed !== num) setNum(parsed)

					setEditingText(null)
				}

				onBlur?.(e)
			}}
			{...props}
		/>
	)
}
