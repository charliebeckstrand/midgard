'use client'

import { type ReactNode, useId, useState } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useAriaIds } from '../../hooks'
import { useFormattedInput } from '../../hooks/use-formatted-input'
import { useHeadless } from '../../providers/headless/context'
import { useLocale } from '../../providers/locale'
import { isComposing } from '../../utilities'
import { useFormValue } from '../form/use-form-value'
import { Input, type InputProps } from '../input'
import { formatEditing, isMeaningful, parseEditing } from './currency-input-utilities'
import { useCurrencyInputFormatting } from './use-currency-input-formatting'

/** Props for {@link CurrencyInput}: {@link InputProps} with a numeric value, a number-valued change callback, and `currency`/`locale`/`precision` formatting controls. */
export type CurrencyInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	/**
	 * The value of a controlled field.
	 *
	 * @remarks
	 * While the field has focus, it shows the typed text. When `value` changes to
	 * a number that the text does not hold, the field shows `value`. A parent
	 * that keeps the same `value` after an edit does not replace the text,
	 * because the field sees no change. The field then shows the typed text until
	 * it loses focus, and after that it shows `value`. For example, a parent that
	 * holds the value at 100 or less shows "1,000" while the user types 1000. The
	 * field shows "100.00" after blur.
	 */
	value?: number | null
	defaultValue?: number
	onValueChange?: (value: number | null) => void
	/** ISO 4217 currency code. Falls back to `<LocaleProvider currency>`, then `USD`. */
	currency?: string
	/**
	 * BCP 47 locale tag. Falls back to `<LocaleProvider locale>`, then the runtime default.
	 *
	 * @remarks The runtime default is the default of the side that renders. It
	 * sets the symbol, the slot of the symbol, and the separators. The server and
	 * the browser can have different defaults. On a page that renders on a
	 * server, set `locale` or a `<LocaleProvider>`, so the two sides agree.
	 */
	locale?: string
	/** Override the number of fraction digits. When omitted, uses the currency's standard fraction digits. */
	precision?: number
}

/**
 * The affixes of a {@link CurrencyInput} and its `aria-describedby`. The symbol
 * goes in the slot that the locale puts it in. A slot from the caller wins.
 *
 * The symbol is text in an affix, so focus mode does not read it. The symbol
 * therefore describes the input, unless the caller replaces its slot. A
 * headless input has no affix, so it gets no symbol id.
 *
 * @internal
 */
function useSymbolAffix({
	symbol,
	symbolIsPrefix,
	prefix,
	suffix,
	ariaDescribedBy,
}: {
	symbol: string
	symbolIsPrefix: boolean
	prefix: ReactNode
	suffix: ReactNode
	ariaDescribedBy: string | undefined
}) {
	const headless = useHeadless()

	const id = useId()

	const shows = !headless && (symbolIsPrefix ? prefix : suffix) === undefined

	const node = shows ? <span id={id}>{symbol}</span> : undefined

	return {
		prefix: prefix ?? (symbolIsPrefix ? node : undefined),
		suffix: suffix ?? (symbolIsPrefix ? undefined : node),
		describedBy: useAriaIds(shows && id, ariaDescribedBy),
	}
}

/**
 * Numeric Input that formats its value as localized currency. Emits a `number`
 * via `onValueChange` while displaying grouped digits and the currency symbol,
 * and binds to an enclosing Form field by `name`. Resolves `currency` and
 * `locale` from props, then `<LocaleProvider>`, then runtime defaults.
 *
 * @remarks Holds a raw editing buffer once typing begins, and falls back to the
 * display formatter once the buffer clears on blur. A value from outside that
 * differs from the buffer's value also clears the buffer, while the field has
 * focus. The buffer formats digits
 * down to grouped output on every keystroke through {@link useFormattedInput},
 * which restores the caret to the typed character across separator insertion. The symbol
 * renders in the `prefix` or `suffix` slot per the locale's symbol position; a
 * caller-supplied `prefix`/`suffix` wins. The symbol describes the input
 * (`aria-describedby`), so a screen reader reads the currency with the value. `Enter` blurs to commit. Group and
 * decimal separators are pinned to the resolved locale via Intl and digits to
 * ASCII (`numberingSystem: 'latn'`), so native-digit locales are normalized.
 * See {@link useCurrencyInputFormatting} for the Intl caveats.
 *
 * A decimal keypad follows the region of the device, so it can offer only the
 * other mark, such as "," in an en-US field. Only an other mark that the user
 * typed or pasted can be the decimal. A group mark that the field wrote stays a
 * group mark, also after a deletion: "1,234" and then Backspace gives 123. The
 * field reads a typed mark as the decimal only when all of these conditions
 * are true:
 *
 * - The text has no locale decimal.
 * - The typed mark is the last mark.
 * - One or more digits follow it, and not more than the fraction digits of the
 *   currency or `precision`.
 * - When the other mark is also the locale group, two digits or fewer follow it.
 *
 * Else it is a group mark, so "1,234" that the user types in an en-US field
 * gives 1234. The text keeps the typed mark, so a later digit can change it to
 * a group mark. After blur, the display writes the locale decimal.
 * @see {@link Input}
 * @see {@link NumberInput}
 * @see {@link useCurrencyInputFormatting}
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
	className,
	ref,
	'aria-describedby': ariaDescribedBy,
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

	// A new value that the buffer does not hold came from outside (a controlled
	// parent, a form reset), so the buffer ends and the field shows that value.
	// The field keeps focus. The check runs only when the value changes: a bound
	// form field can take one render longer than the buffer to change.
	const [heldNum, setHeldNum] = useState(num)

	if (heldNum !== num) {
		setHeldNum(num)

		if (
			editingText !== null &&
			parseEditing(editingText, group, decimal, maxFractionDigits) !== (num ?? undefined)
		) {
			setEditingText(null)
		}
	}

	const text = editingText ?? (num === undefined ? '' : displayFormatter.format(num))

	const affix = useSymbolAffix({ symbol, symbolIsPrefix, prefix, suffix, ariaDescribedBy })

	// `atEnd: 'jump'`: the formatter pads `.` to `0.`, so a restore at the end would
	// put the next digit in the integer part (`.5` to `5.`). `text` is the text
	// before the edit. The format compares the edit with it to find the other
	// mark that the user typed.
	const { ref: setRefs, reformat } = useFormattedInput({
		format: (raw) => formatEditing(raw, resolvedLocale, decimal, maxFractionDigits, text),
		meaningful: (c, index, edited) =>
			isMeaningful(c, index, edited, group, decimal, maxFractionDigits, text),
		atEnd: 'jump',
		ref,
	})

	return (
		<Input
			ref={setRefs}
			data-slot="currency-input"
			type="text"
			inputMode="decimal"
			prefix={affix.prefix}
			suffix={affix.suffix}
			aria-describedby={affix.describedBy}
			className={cn('tabular-nums', className)}
			name={name}
			value={text}
			onFocus={onFocus}
			onKeyDown={composeEventHandlers(onKeyDown, (event) => {
				// Enter that confirms an input-method candidate must not blur the field.
				if (event.key === 'Enter' && !isComposing(event)) event.currentTarget.blur()
			})}
			// The commit and the touched mark run whatever the caller does
			// (CONVENTIONS.md §3.9).
			onBlur={composeEventHandlers(
				onBlur,
				() => {
					if (editingText !== null) {
						const parsed = parseEditing(editingText, group, decimal, maxFractionDigits)

						if (parsed !== num) setNum(parsed)

						setEditingText(null)
					}

					setTouched()
				},
				{ checkForDefaultPrevented: false },
			)}
			{...props}
			// The formatting wiring sits after the spread, so a stray `onChange`
			// does not replace it (CONVENTIONS.md §3.9).
			onChange={(event) => {
				const formatted = reformat(event)

				setEditingText(formatted)

				const parsed = parseEditing(formatted, group, decimal, maxFractionDigits)

				// Guard like the blur path: a keystroke that changes the text but
				// not the number — a trailing separator, a digit past `precision` —
				// must not re-emit the value it already holds.
				if (parsed !== num) setNum(parsed)
			}}
		/>
	)
}
