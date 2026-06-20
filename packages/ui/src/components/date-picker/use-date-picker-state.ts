'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'

import { useFloatingUI } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControl } from '../control/context'
import { useFormValue } from '../form/use-form-value'
import type { DatePickerBaseProps, DatePickerSingleProps } from './date-picker'
import { addDays, addMonths, clampDate, formatDate, startOfDay } from './date-picker-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import { type FooterButton, useDatePickerKeyboard } from './use-date-picker-keyboard'

/**
 * Single-date state for {@link DatePicker}: Form/Control binding, popover
 * open/active wiring, the virtual-highlight keyboard handler, and the
 * clear/today footer.
 *
 * @returns Trigger props (`triggerId`, `displayValue`, `disabled`, `invalid`,
 * …), popover plumbing (`open`, `onOpenChange`, `setReference`, `setFloating`,
 * `floatingStyles`, floating-ui prop getters, `context`), the keyboard handler
 * `onTriggerKeyDown`, and the `calendar`/`footer` prop bundles for the open
 * dialog.
 * @internal
 */
export function useDatePickerState({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	min,
	max,
	placement = 'bottom-start',
	disabled = false,
}: DatePickerBaseProps & DatePickerSingleProps) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const resolvedDisabled = disabled || control?.disabled === true

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

	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLElement | null>(null)

	const [active, setActive] = useState<CalendarActive | null>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	const getInitialActiveDate = useCallback(
		() => clampDate(value ?? min ?? new Date(), min, max),
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
	}, [])

	const closeCalendar = useCallback(() => {
		setOpen(false)

		setActive(null)

		// Closing the popover (select, clear, dismiss, or Escape) is the field's
		// "blur" — mark it touched so validateOn="touched" rules can fire.
		setTouched()
	}, [setTouched])

	const handleSelect = useCallback(
		(date: Date) => {
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

	const footerButtons = useMemo<FooterButton[]>(() => {
		const today = new Date()

		// Offer Today only when today is selectable; out of range it would commit
		// a clamped boundary day, not today, so suppress it instead.
		const todayInRange = clampDate(today, min, max).getTime() === startOfDay(today).getTime()

		const buttons: FooterButton[] = []

		if (value != null) buttons.push('clear')

		if (todayInRange) buttons.push('today')

		return buttons
	}, [value, min, max])

	const { refs, floatingStyles, context, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
		role: 'dialog',
		returnFocusTo: triggerRef,
	})

	// Public open-change entry: routes through floating-ui's context so a
	// caller-supplied close reason reaches `useFloatingPanel`'s reason-aware
	// focus return.
	const onOpenChange = useCallback(
		(nextOpen: boolean, event?: Event, reason?: OpenChangeReason) =>
			context.onOpenChange(nextOpen, event, reason),
		[context],
	)

	// Captures the trigger for `useFloatingUI`'s `returnFocusTo`;
	// `FloatingFocusManager` runs with `returnFocus={false}`.
	const setReference = useCallback(
		(node: HTMLElement | null) => {
			triggerRef.current = node

			refs.setReference(node)
		},
		[refs],
	)

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
		describedBy: control?.describedBy,
		disabled: resolvedDisabled,
		required: control?.required,
		invalid: control?.invalid || fieldInvalid,
		value,
		setValue,
		displayValue: value ? formatDate(value) : '',
		open,
		onOpenChange,
		onTriggerKeyDown,
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
