'use client'

import { type KeyboardEvent, useCallback, useId, useMemo, useRef, useState } from 'react'

import { useIdScope } from '../../hooks/use-id-scope'
import { useLocale } from '../../providers/locale'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControlProps } from '../control/use-control-props'
import { useFormValue } from '../form/use-form-value'
import type { DatePickerBaseProps, DatePickerSingleProps } from './date-picker'
import { addDays, addMonths, clampDate, formatDate, startOfDay } from './date-picker-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import { useDatePickerFloating } from './use-date-picker-floating'
import { type FooterButton, useDatePickerKeyboard } from './use-date-picker-keyboard'
import { useDatePickerOpen } from './use-date-picker-open'

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

	// Binds the selected date to an enclosing Form field by `name` (value-typed
	// cascade); the field error merges with Control's invalid below.
	const {
		value,
		setValue,
		setTouched,
		invalid: fieldInvalid,
	} = useFormValue<Date>(name, {
		value: useDatePickerControlled(valueProp),
		defaultValue,
		onValueChange,
	})

	// The Control cascade: an explicit prop wins over the enclosing Control, and
	// the field error merges with an ambient error severity.
	const controlProps = useControlProps({ disabled, readOnly, invalid: fieldInvalid })

	const scope = useIdScope({ id: controlProps.id })

	const resolvedDisabled = controlProps.disabled === true

	const resolvedReadOnly = controlProps.readOnly === true

	const { open, setOpen, triggerRef } = useDatePickerOpen({
		open: openProp,
		defaultOpen,
		onOpenChange: onOpenChangeProp,
		readOnly: resolvedReadOnly,
	})

	const [active, setActive] = useState<CalendarActive | null>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	// With no value, the cursor starts on today. A `min` or a `max` only bounds it.
	const getInitialActiveDate = useCallback(
		() => clampDate(value ?? new Date(), min, max),
		[value, min, max],
	)

	const moveGridDate = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			return clampDate(addDays(base, delta), min, max)
		},
		[active, getInitialActiveDate, min, max],
	)

	const moveGridMonths = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			return clampDate(addMonths(base, delta), min, max)
		},
		[active, getInitialActiveDate, min, max],
	)

	const openCalendar = useCallback(() => {
		setOpen(true)

		setActive(null)
	}, [setOpen])

	const closeCalendar = useCallback(() => {
		setOpen(false)

		setActive(null)

		// Closing the popover (select, clear, dismiss, or Escape) is the field's
		// "blur" — mark it touched so validateOn="touched" rules can fire.
		setTouched()
	}, [setTouched, setOpen])

	// readOnly blocks every value write, not only the open paths. A controlled
	// `open` can still show the calendar, and the typed input reaches this too.
	const writeValue = useCallback(
		(next: Date | null | undefined) => {
			if (resolvedReadOnly) return

			setValue(next)
		},
		[resolvedReadOnly, setValue],
	)

	const handleSelect = useCallback(
		(date: Date | null) => {
			if (date === null) return

			writeValue(date)

			closeCalendar()
		},
		[closeCalendar, writeValue],
	)

	const handleClear = useCallback(() => {
		writeValue(undefined)

		closeCalendar()
	}, [closeCalendar, writeValue])

	const handleSelectToday = useCallback(() => {
		// Clamp so the footer Today action can never commit a date outside the
		// min/max bounds (every other entry path is already bounds-checked).
		handleSelect(clampDate(new Date(), min, max))
	}, [handleSelect, min, max])

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) openCalendar()
			else closeCalendar()
		},
		[closeCalendar, openCalendar],
	)

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
		if (resolvedReadOnly) return []

		const today = new Date()

		// Offer Today only when today is selectable; out of range it would commit
		// a clamped boundary day, not today, so suppress it instead.
		const todayInRange = clampDate(today, min, max).getTime() === startOfDay(today).getTime()

		const buttons: FooterButton[] = []

		if (showClear && value != null) buttons.push('clear')

		if (showToday && todayInRange) buttons.push('today')

		return buttons
	}, [resolvedReadOnly, value, min, max, showClear, showToday])

	const {
		refs,
		floatingStyles,
		context,
		getReferenceProps,
		getFloatingProps,
		onOpenChange,
		setReference,
		dialogId,
	} = useDatePickerFloating({ placement, open, onOpenChange: handleOpenChange, triggerRef })

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
		disabled: resolvedDisabled,
		open,
		input,
		active,
		setActive,
		openCalendar,
		closeCalendar,
		moveGridDate,
		moveGridMonths,
		getInitialActiveDate,
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate,
	})

	return {
		triggerId: scope.id,
		dialogId,
		describedBy: controlProps['aria-describedby'],
		disabled: resolvedDisabled,
		readOnly: resolvedReadOnly,
		required: controlProps.required,
		invalid: controlProps.invalid,
		validation: controlProps.validation,
		value,
		setValue: writeValue,
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
			footerRef,
		},
		footer: {
			active,
			footerButtons,
			onClear: handleClear,
			onToday: handleSelectToday,
			footerRef,
			onKeyDown: (event: KeyboardEvent<HTMLDivElement>) =>
				calendarRef.current?.footerKeyDown(event),
		},
	}
}
