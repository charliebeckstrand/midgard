'use client'

import { Calendar as CalendarIcon, X } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { composeEventHandlers } from '../../core'
import { useComposedRef } from '../../hooks'
import { useFormattedInput } from '../../hooks/use-formatted-input'
import { Button } from '../button'
import { useControl } from '../control/context'
import { Message } from '../fieldset'
import { useFormValue } from '../form/use-form-value'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import {
	type DateInputFormat,
	dateInputSeparator,
	formatDateValue,
	isDayInRange,
	isSameDay,
	maskDateText,
	parseDateText,
} from './date-input-utilities'

/**
 * Props for {@link DateInput}. Extends {@link InputProps} but takes over the
 * native `value`/`defaultValue`/`onChange`/`min`/`max` with `Date`-typed,
 * masking-aware equivalents and fixes `type`/`inputMode`.
 */
export type DateInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
> & {
	/** Controlled date. `null` keeps the field controlled with no current value. */
	value?: Date | null
	defaultValue?: Date
	/** Fires with the parsed Date once the text is a complete in-range date; fires `undefined` when it stops being one. */
	onValueChange?: (value: Date | undefined) => void
	/**
	 * Pattern that masks and parses the typed text.
	 *
	 * @defaultValue 'MM/DD/YYYY'
	 */
	format?: DateInputFormat
	/** Earliest accepted day; a complete date before it marks the input invalid and emits `undefined`. */
	min?: Date
	/** Latest accepted day; a complete date after it marks the input invalid and emits `undefined`. */
	max?: Date
	/**
	 * Renders a clear button before the suffix whenever the field holds any text —
	 * including a partial, not-yet-complete entry; clearing empties the field,
	 * emits `undefined`, and returns focus to the input. In a `DatePicker`'s
	 * `input` mode this clears the picker itself through the bound `onValueChange`.
	 *
	 * @defaultValue true
	 */
	clearable?: boolean
	/**
	 * Error message shown while the typed entry is invalid, as an error
	 * `<Message>` wired into the field's `aria-describedby`. Pass `null` (or
	 * `false`) to suppress it and supply your own.
	 *
	 * @defaultValue `Enter a valid date (${format})`
	 */
	invalidMessage?: ReactNode
}

/**
 * Text Input that masks typed digits into a date pattern (`format`, default
 * `MM/DD/YYYY`). Emits a `Date` via `onValueChange` once the text is a
 * complete, real, in-range date. Marks itself invalid — and renders the
 * `invalidMessage` — when a complete entry does not parse, when it falls
 * outside `min`/`max`, or when blur leaves a partial entry behind. Controlled
 * or uncontrolled via `value`/`defaultValue`, and bound to an enclosing Form
 * field by `name` (the stored value is the `Date`).
 *
 * @remarks
 * Falls back to an `aria-label` of `'Date'` only when no Field `<Label>` is
 * registered; `placeholder` is not a programmatic name (WCAG 3.3.2 / 4.1.2).
 * Enter blurs the input, committing or renormalizing the current entry.
 *
 * @see {@link maskDateText} for the masking rules.
 * @see {@link parseDateText} for the parse/validation contract.
 */
export function DateInput({
	value,
	defaultValue,
	onValueChange,
	format = 'MM/DD/YYYY',
	min,
	max,
	invalidMessage = `Enter a valid date (${format})`,
	placeholder,
	invalid,
	suffix,
	clearable = true,
	disabled,
	readOnly,
	name,
	ref,
	onBlur,
	onKeyDown,
	'aria-label': ariaLabel,
	...props
}: DateInputProps) {
	const control = useControl()

	const inputRef = useRef<HTMLInputElement>(null)

	const setExternalRef = useComposedRef(inputRef, ref)

	const {
		value: date,
		setValue: setDate,
		setTouched,
	} = useFormValue<Date>(name, { value, defaultValue, onValueChange })

	// Text being edited; null means "derive the display from the value".
	const [editingText, setEditingText] = useState<string | null>(null)

	const [typedInvalid, setTypedInvalid] = useState(false)

	const separator = dateInputSeparator(format)

	const parse = (text: string): Date | undefined => {
		const parsed = parseDateText(text, format)

		return parsed && isDayInRange(parsed, min, max) ? parsed : undefined
	}

	// Last value this input committed. Tells an external value change (a form
	// reset, a calendar pick) apart from the echo of its own commit.
	const emitted = useRef<Date | undefined>(undefined)

	const known = useRef(date)

	if (known.current !== date) {
		known.current = date

		// An external change overrides any in-progress text.
		if (editingText !== null && !isSameDay(date, emitted.current)) {
			setEditingText(null)

			setTypedInvalid(false)
		}
	}

	const text = editingText ?? (date === undefined ? '' : formatDateValue(date, format))

	const { ref: setRefs, reformat } = useFormattedInput({
		format: (raw) => maskDateText(raw, format),
		ref: setExternalRef,
	})

	const resolvedDisabled = disabled ?? control?.disabled

	const resolvedReadOnly = readOnly ?? control?.readOnly

	const commit = (next: string): Date | undefined => {
		const parsed = parse(next)

		// Re-stating the held day is not a change; the value keeps its identity
		// (and any time of day it carries).
		if (!isSameDay(parsed, date)) {
			emitted.current = parsed

			setDate(parsed)
		}

		return parsed
	}

	return (
		<>
			<Input
				ref={setRefs}
				data-slot="date-input"
				type="text"
				inputMode="numeric"
				// The placeholder is not a programmatic name (WCAG 3.3.2 / 4.1.2);
				// defaults an aria-label, yielding to a registered Field <Label>
				// (aria-labelledby outranks aria-label in the accname computation).
				aria-label={ariaLabel ?? (control?.labelledBy ? undefined : 'Date')}
				placeholder={placeholder ?? format}
				autoComplete="off"
				disabled={disabled}
				readOnly={readOnly}
				suffix={dateInputSuffix({
					clearable,
					// Any text counts, including a partial entry that hasn't committed a
					// complete `Date` yet — clearable tracks the field, not the value.
					hasValue: text !== '',
					disabled: resolvedDisabled,
					readOnly: resolvedReadOnly,
					suffix,
					onClear: () => clearDateInput(inputRef.current),
				})}
				invalid={invalid ?? (typedInvalid || undefined)}
				name={name}
				value={text}
				onChange={(event) => {
					const raw = event.target.value

					let next: string

					if (text.endsWith(separator) && raw === text.slice(0, -1)) {
						// The mask re-appends a deleted trailing separator and traps the
						// caret; backspace over it deletes the preceding digit instead.
						next = maskDateText(raw.slice(0, -1), format)
					} else if ((event.target.selectionStart ?? raw.length) >= raw.length) {
						// Typing at the end: let the value swap put the caret at the end.
						// The meaningful-count restore would pin it before a digit the
						// mask pads in (`1/` → `01/`).
						next = maskDateText(raw, format)
					} else {
						next = reformat(event)
					}

					setEditingText(next)

					const parsed = commit(next)

					setTypedInvalid(next.length === format.length && !parsed)
				}}
				onBlur={(event) => {
					if (editingText !== null) {
						const parsed = commit(editingText)

						// A parsed entry renormalizes to the canonical zero-padded text; a
						// partial one stays as typed and reads invalid.
						if (parsed || editingText === '') setEditingText(null)

						setTypedInvalid(editingText !== '' && !parsed)
					}

					setTouched()

					onBlur?.(event)
				}}
				onKeyDown={composeEventHandlers(onKeyDown, (event) => {
					if (event.key === 'Enter') event.currentTarget.blur()
				})}
				{...props}
			/>

			{/* Visible feedback gated on the component's own detection, not the
			    external `invalid` prop; the input's aria-invalid comes from the
			    `invalid` prop above, never from this Message. */}
			{typedInvalid && invalidMessage ? <Message severity="error">{invalidMessage}</Message> : null}
		</>
	)
}

/**
 * Clears `input` through a native input event, so controlled and uncontrolled
 * consumers both observe the change (committing `undefined`), then returns focus
 * to it as the clear button unmounts (WCAG 2.4.3). Mirrors SearchInput.
 *
 * @internal
 */
function clearDateInput(input: HTMLInputElement | null) {
	if (!input) return

	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

	setter?.call(input, '')

	input.dispatchEvent(new Event('input', { bubbles: true }))

	input.focus()
}

/**
 * Resolves the {@link DateInput} suffix: a clear button ahead of the field's own
 * suffix while `clearable` and the field holds text, else the suffix unchanged —
 * so an absent suffix (`undefined`/`false`) leaves no empty affix slot.
 *
 * @internal
 */
function dateInputSuffix({
	clearable,
	hasValue,
	disabled,
	readOnly,
	suffix,
	onClear,
}: {
	clearable: boolean
	hasValue: boolean
	disabled?: boolean
	readOnly?: boolean
	suffix: ReactNode
	onClear: () => void
}): ReactNode {
	const resolved = suffix ?? <Icon icon={<CalendarIcon />} />

	if (!clearable || !hasValue || disabled || readOnly) return resolved

	const clear = (
		<Button
			variant="bare"
			className="pointer-events-auto"
			aria-label="Clear date"
			// Keep focus on the input: a blur here would run the field's
			// commit-on-blur over a partial entry before the clear lands.
			onMouseDown={(event) => event.preventDefault()}
			onClick={onClear}
		>
			<Icon icon={<X />} />
		</Button>
	)

	// The default decorative calendar icon yields to the clear (mirroring
	// Listbox/Combobox), so the trailing glyph holds its place rather than the
	// icon sliding over to make room for the clear. A consumer-provided suffix —
	// the DatePicker's calendar button in `input` mode — stays alongside instead;
	// both being bare buttons, the affix slot's padding is unchanged either way.
	const ownSuffix = suffix != null && suffix !== false

	return ownSuffix ? (
		<>
			{clear}
			{suffix}
		</>
	) : (
		clear
	)
}
