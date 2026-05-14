'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useControllable } from '../../hooks'
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
	/** ISO 4217 currency code. Defaults to `USD`. */
	currency?: string
	/** BCP 47 locale tag. Defaults to the runtime default. */
	locale?: string
	/** Override the number of fraction digits. Defaults to the currency's standard. */
	precision?: number
}

export function CurrencyInput({
	value,
	defaultValue,
	onValueChange,
	currency = 'USD',
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
	const [num, setNum] = useControllable<number>({
		value,
		defaultValue,
		onChange: onValueChange,
	})

	const { displayFormatter, symbol, symbolIsPrefix, group, decimal, maxFractionDigits } =
		useCurrencyInputFormatting({ currency, locale, precision })

	const [editingText, setEditingText] = useState<string | null>(null)

	const text = editingText ?? (num === undefined ? '' : displayFormatter.format(num))

	const inputRef = useRef<HTMLInputElement | null>(null)

	const pendingCursorRef = useRef<number | null>(null)

	const setRefs = useCallback(
		(node: HTMLInputElement | null) => {
			inputRef.current = node

			if (typeof ref === 'function') ref(node)
			else if (ref) ref.current = node
		},
		[ref],
	)

	useLayoutEffect(() => {
		const target = pendingCursorRef.current

		if (target === null) return

		pendingCursorRef.current = null

		const el = inputRef.current

		if (el && document.activeElement === el) {
			el.setSelectionRange(target, target)
		}
	})

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

				const formatted = formatEditing(raw, locale, decimal, maxFractionDigits)

				pendingCursorRef.current = cursorForCount(formatted, meaningfulBefore, decimal)

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
