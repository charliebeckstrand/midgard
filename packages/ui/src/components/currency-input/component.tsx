'use client'

import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useControllable } from '../../hooks'
import { Input, type InputProps } from '../input'

export type CurrencyInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: number | null
	defaultValue?: number
	onChange?: (value: number | undefined) => void
	/** ISO 4217 currency code. Defaults to `USD`. */
	currency?: string
	/** BCP 47 locale tag. Defaults to the runtime default. */
	locale?: string
	/** Override the number of fraction digits. Defaults to the currency's standard. */
	precision?: number
}

function parseNumber(text: string): number | undefined {
	const cleaned = text.replace(/[^\d.-]/g, '')

	if (cleaned === '' || cleaned === '-' || cleaned === '.') return undefined

	const n = Number(cleaned)

	return Number.isNaN(n) ? undefined : n
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
	function CurrencyInput(
		{
			value,
			defaultValue,
			onChange,
			currency = 'USD',
			locale,
			precision,
			onFocus,
			onBlur,
			...props
		},
		ref,
	) {
		const [num, setNum] = useControllable<number>({ value, defaultValue, onChange })

		const formatter = useMemo(
			() =>
				new Intl.NumberFormat(locale, {
					style: 'currency',
					currency,
					...(precision !== undefined && {
						minimumFractionDigits: precision,
						maximumFractionDigits: precision,
					}),
				}),
			[locale, currency, precision],
		)

		const [focused, setFocused] = useState(false)
		const [text, setText] = useState(() => (num === undefined ? '' : formatter.format(num)))

		// Reflect external numeric changes when the field is not being edited.
		useEffect(() => {
			if (focused) return

			setText(num === undefined ? '' : formatter.format(num))
		}, [num, focused, formatter])

		return (
			<Input
				ref={ref}
				type="text"
				inputMode="decimal"
				value={text}
				onFocus={(e) => {
					setFocused(true)
					setText(num === undefined ? '' : String(num))
					onFocus?.(e)
				}}
				onChange={(e) => {
					const v = e.target.value

					setText(v)
					setNum(parseNumber(v))
				}}
				onBlur={(e) => {
					setFocused(false)

					const parsed = parseNumber(text)

					if (parsed !== num) setNum(parsed)

					setText(parsed === undefined ? '' : formatter.format(parsed))

					onBlur?.(e)
				}}
				{...props}
			/>
		)
	},
)
