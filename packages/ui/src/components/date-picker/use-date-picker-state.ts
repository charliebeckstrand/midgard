'use client'

import type { DateDuration } from '@internationalized/date'
import { useCallback, useId, useMemo, useRef, useState } from 'react'

import { useLocale } from '../../providers/locale'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControlPickerField } from '../control/use-control-picker-field'
import { useControlPickerPopover } from '../control/use-control-picker-popover'
import type { DatePickerBaseProps, DatePickerSingleProps } from './date-picker'
import { clampDate, formatDate, startOfDay, stepDate } from './date-picker-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import {
	type FooterButton,
	useDatePickerGridEntry,
	useDatePickerKeyboard,
} from './use-date-picker-keyboard'

/**
 * Single-date state for {@link DatePicker}: Form/Control binding, popover
 * open/active wiring, the virtual-highlight keyboard handler, and the
 * clear/today footer.
 *
 * @returns Trigger props (`triggerId`, `dialogId`, `displayValue`, `disabled`,
 * `readOnly`, `invalid`, …) and popover plumbing (`open`, `onOpenChange`, `setReference`,
 * `setFloating`, `floatingStyles`, floating-ui prop getters, `context`). It
 * also returns the keyboard handler `onTriggerKeyDown`, and the
 * `calendar`/`footer` prop bundles for the open dialog.
 * @internal
 */
export function useDatePickerState({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	min,
	max,
	footer,
	placement = 'bottom-start',
	disabled,
	readOnly,
	open: openProp,
	defaultOpen,
	onOpenChange: onOpenChangeProp,
	input = false,
}: DatePickerBaseProps & DatePickerSingleProps) {
	// The trigger label reads the same ambient locale the Calendar beside it does.
	const ambient = useLocale()

	// `input` mode keeps DOM focus on the DateInput and drives the calendar via
	// the active-descendant pattern: the input's `aria-controls` points at the
	// day listbox and its `aria-activedescendant` at the roved cell (whose id is
	// stamped by the grid). Generated unconditionally; only the input path reads
	// them.
	const listboxId = useId()

	const activeDescendantId = useId()

	// Binds the selected date to an enclosing Form field by `name`, and resolves
	// the Control cascade. `setValue` writes nothing while readOnly is on.
	const { value, setValue, setTouched, field } = useControlPickerField<Date>({
		name,
		value: useDatePickerControlled(valueProp),
		defaultValue,
		onValueChange,
		disabled,
		readOnly,
	})

	// The native input of the DateInput in `input` mode. The dialog opens with
	// focus on it, and a close returns focus to it. Without `input`, the focus
	// home is unset, and the dialog and the trigger keep their defaults.
	const inputRef = useRef<HTMLInputElement>(null)

	const focusHomeRef = input ? inputRef : undefined

	const [active, setActive] = useState<CalendarActive | null>(null)

	// Each open and each close drops the highlight of the keyboard model.
	const clearActive = useCallback(() => setActive(null), [])

	const {
		open,
		openPicker: openCalendar,
		closePicker: closeCalendar,
		onOpenChange,
		triggerRef,
		refs,
		setReference,
		dialogId,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
	} = useControlPickerPopover({
		placement,
		open: openProp,
		defaultOpen,
		onOpenChange: onOpenChangeProp,
		readOnly: field.readOnly,
		setTouched,
		onOpen: clearActive,
		onClose: clearActive,
		returnFocusTo: focusHomeRef,
	})

	const calendarRef = useRef<CalendarHandle>(null)

	// With no value, the cursor starts on today. A `min` or a `max` only bounds it.
	const { getInitialActiveDate, getViewEntryDate } = useDatePickerGridEntry(
		value,
		min,
		max,
		calendarRef,
	)

	// A step of days or months starts on `from`, the day that the key handler
	// gives, and stays between `min` and `max`.
	const moveGrid = useCallback(
		(step: DateDuration, from: Date) => clampDate(stepDate(from, step), min, max),
		[min, max],
	)

	const handleSelect = useCallback(
		(date: Date | null) => {
			if (date === null) return

			setValue(date)

			closeCalendar()
		},
		[closeCalendar, setValue],
	)

	const handleClear = useCallback(() => {
		setValue(undefined)

		closeCalendar()
	}, [closeCalendar, setValue])

	const handleSelectToday = useCallback(() => {
		// Clamp so the footer Today action can never commit a date outside the
		// min/max bounds (every other entry path is already bounds-checked).
		handleSelect(clampDate(new Date(), min, max))
	}, [handleSelect, min, max])

	const onFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
			else handleSelectToday()
		},
		[handleClear, handleSelectToday],
	)

	// Footer toggles default on; a `false` drops the button from the rendered
	// toolbar and the keyboard model alike, since `footerButtons` feeds both.
	// readOnly drops the whole footer, because its buttons cannot write a value.
	const showClear = footer?.clear !== false

	const showToday = footer?.today !== false

	const footerButtons = useMemo<FooterButton[]>(() => {
		if (field.readOnly) return []

		const today = new Date()

		// Offer Today only when today is selectable; out of range it would commit
		// a clamped boundary day, not today, so suppress it instead.
		const todayInRange = clampDate(today, min, max).getTime() === startOfDay(today).getTime()

		const buttons: FooterButton[] = []

		if (showClear && value != null) buttons.push('clear')

		if (showToday && todayInRange) buttons.push('today')

		return buttons
	}, [field.readOnly, value, min, max, showClear, showToday])

	// Captures the dialog for `useDatePickerInputTab`'s reference-side handler.
	const floatingRef = useRef<HTMLElement | null>(null)

	const setFloating = useCallback(
		(node: HTMLElement | null) => {
			floatingRef.current = node

			refs.setFloating(node)
		},
		[refs],
	)

	const onTriggerKeyDown = useDatePickerKeyboard({
		disabled: field.disabled,
		open,
		input,
		active,
		setActive,
		openCalendar,
		closeCalendar,
		moveGrid,
		getInitialActiveDate,
		getViewEntryDate,
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate,
	})

	return {
		...field,
		dialogId,
		value,
		setValue,
		hasValue: value != null,
		onClear: handleClear,
		displayValue: value ? formatDate(value, ambient.locale, ambient.dateFormat) : '',
		open,
		onOpenChange,
		onTriggerKeyDown,
		listboxId,
		activeDescendantId,
		// Active-descendant wiring for the DateInput while `input` mode keeps focus
		// on it: `aria-controls` names the day listbox once open, and
		// `aria-activedescendant` follows the roved grid cell (the only zone whose
		// element carries `activeDescendantId`); both drop when there is no grid
		// highlight, so the header/footer zones and the closed state clear it.
		inputAria: {
			'aria-controls': open ? listboxId : undefined,
			'aria-activedescendant': active?.zone === 'grid' ? activeDescendantId : undefined,
		},
		setReference,
		setFloating,
		triggerRef,
		inputRef,
		focusHomeRef,
		floatingRef,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
		calendar: {
			value: value ?? null,
			onValueChange: handleSelect,
			active: open ? active : null,
			calendarRef,
		},
		footer: {
			active,
			footerButtons,
			onClear: handleClear,
			onToday: handleSelectToday,
		},
	}
}
