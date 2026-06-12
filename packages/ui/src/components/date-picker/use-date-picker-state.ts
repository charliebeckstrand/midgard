'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'

import { useFloatingUI } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useIdScope } from '../../hooks/use-id-scope'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControl } from '../control/context'
import type { DatePickerBaseProps, DatePickerSingleProps } from './date-picker'
import { addDays, addMonths, clampDate, formatDate } from './date-picker-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import { type FooterButton, useDatePickerKeyboard } from './use-date-picker-keyboard'

export function useDatePickerState({
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

	const [value, setValue] = useControllable({
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
	}, [])

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
		handleSelect(new Date())
	}, [handleSelect])

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

	const footerButtons = useMemo<FooterButton[]>(
		() => (value != null ? ['clear', 'today'] : ['today']),
		[value],
	)

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
		invalid: control?.invalid,
		value,
		setValue,
		displayValue: value ? formatDate(value) : '',
		open,
		onOpenChange,
		onTriggerKeyDown,
		setReference,
		setFloating: refs.setFloating,
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
			onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => calendarRef.current?.footerKeyDown(e),
		},
	}
}
