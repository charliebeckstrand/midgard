'use client'

import {
	forwardRef,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useControllable } from '../../hooks'
import { Input, type InputProps } from '../input'
import { countMeaningful, cursorForCount, formatEditing, parseEditing } from './utilities'

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

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
	function CurrencyInput(
		{
			value,
			defaultValue,
			onChange,
			currency = 'USD',
			locale,
			precision,
			prefix,
			suffix,
			onFocus,
			onBlur,
			onKeyDown,
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

		const { symbol, symbolIsPrefix, group, decimal, maxFractionDigits } = useMemo(() => {
			const parts = formatter.formatToParts(0)

			const currencyPart = parts.find((p) => p.type === 'currency')

			const groupPart = parts.find((p) => p.type === 'group')

			const decimalPart = parts.find((p) => p.type === 'decimal')

			const currencyIdx = parts.findIndex((p) => p.type === 'currency')

			const integerIdx = parts.findIndex((p) => p.type === 'integer')

			const options = formatter.resolvedOptions()

			return {
				symbol: currencyPart?.value ?? '',
				symbolIsPrefix: currencyIdx < integerIdx,
				group: groupPart?.value ?? ',',
				decimal: decimalPart?.value ?? '.',
				maxFractionDigits: options.maximumFractionDigits ?? 2,
			}
		}, [formatter])

		const displayFormatter = useMemo(() => {
			const options = formatter.resolvedOptions()

			return new Intl.NumberFormat(locale, {
				style: 'decimal',
				useGrouping: true,
				minimumFractionDigits: options.minimumFractionDigits,
				maximumFractionDigits: options.maximumFractionDigits,
			})
		}, [formatter, locale])

		const editingRef = useRef(false)

		const [text, setText] = useState(() => (num === undefined ? '' : displayFormatter.format(num)))

		// Reflect external numeric changes when the field is not being edited.
		useEffect(() => {
			if (editingRef.current) return

			setText(num === undefined ? '' : displayFormatter.format(num))
		}, [num, displayFormatter])

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
				onFocus={(e) => {
					editingRef.current = true

					onFocus?.(e)
				}}
				onKeyDown={(e) => {
					onKeyDown?.(e)

					if (!e.defaultPrevented && e.key === 'Enter') {
						e.currentTarget.blur()
					}
				}}
				onChange={(e) => {
					editingRef.current = true

					const raw = e.target.value

					const cursor = e.target.selectionStart ?? raw.length

					const meaningfulBefore = countMeaningful(raw, cursor, decimal)

					const formatted = formatEditing(raw, locale, decimal, maxFractionDigits)

					pendingCursorRef.current = cursorForCount(formatted, meaningfulBefore, decimal)

					setText(formatted)

					setNum(parseEditing(formatted, group, decimal))
				}}
				onBlur={(e) => {
					editingRef.current = false

					const parsed = parseEditing(text, group, decimal)

					if (parsed !== num) setNum(parsed)

					setText(parsed === undefined ? '' : displayFormatter.format(parsed))

					onBlur?.(e)
				}}
				{...props}
			/>
		)
	},
)
