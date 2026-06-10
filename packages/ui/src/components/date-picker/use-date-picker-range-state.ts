'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type KeyboardEvent, useCallback, useMemo, useReducer, useRef, useState } from 'react'

import { useA11yFocusReturn, useFloatingUI } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useIdScope } from '../../hooks/use-id-scope'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControl } from '../control/context'
import type { DatePickerBaseProps, DatePickerRangeProps } from './date-picker'
import { datePickerRangeReducer, initialDatePickerRangeState } from './date-picker-range-reducer'
import { addDays, addMonths, clampDate, formatRange } from './date-picker-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import { type FooterButton, useDatePickerKeyboard } from './use-date-picker-keyboard'

export function useDatePickerRangeState({
	value: valueProp,
	defaultValue,
	onValueChange,
	min,
	max,
	placement = 'bottom-start',
	disabled = false,
}: DatePickerBaseProps & DatePickerRangeProps) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const resolvedDisabled = disabled || control?.disabled === true

	const [value, setValue] = useControllable({
		value: useDatePickerControlled(valueProp),
		defaultValue,
		onValueChange,
	})

	const [open, setOpen] = useState(false)

	const { captureTrigger, skipNextRefocus } = useA11yFocusReturn(open)

	const [state, dispatch] = useReducer(datePickerRangeReducer, initialDatePickerRangeState)

	const { rangeStart, hoverDate, active } = state

	const pendingRef = useRef<{ value: [Date, Date] | undefined } | null>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			setValue(pendingRef.current.value)

			pendingRef.current = null
		}

		dispatch({ type: 'reset' })
	}, [setValue])

	const getInitialActiveDate = useCallback(
		() => clampDate(rangeStart ?? value?.[0] ?? min ?? new Date(), min, max),
		[rangeStart, value, min, max],
	)

	const moveGridDate = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			const next = clampDate(addDays(base, delta), min, max)

			if (rangeStart !== null) dispatch({ type: 'hover', date: next })

			return next
		},
		[active, getInitialActiveDate, min, max, rangeStart],
	)

	const moveGridMonths = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			const next = clampDate(addMonths(base, delta), min, max)

			if (rangeStart !== null) dispatch({ type: 'hover', date: next })

			return next
		},
		[active, getInitialActiveDate, min, max, rangeStart],
	)

	const openCalendar = useCallback(() => {
		flushPending()

		setOpen(true)
	}, [flushPending])

	const closeCalendar = useCallback(() => {
		setOpen(false)
	}, [])

	const handleClear = useCallback(() => {
		pendingRef.current = { value: undefined }

		closeCalendar()
	}, [closeCalendar])

	const handleSelect = useCallback(
		(date: Date) => {
			if (rangeStart === null) {
				dispatch({ type: 'startRange', date })
			} else {
				const start = rangeStart

				const end = date

				const range: [Date, Date] = start.getTime() <= end.getTime() ? [start, end] : [end, start]

				// Pin both endpoints so the range stays stable through the exit animation.
				dispatch({ type: 'pinEndpoint', date: end })

				pendingRef.current = { value: range }

				closeCalendar()
			}
		},
		[closeCalendar, rangeStart],
	)

	const handleOpenChange = useCallback(
		(nextOpen: boolean, _event?: Event, reason?: OpenChangeReason) => {
			if (!nextOpen) {
				if (reason === 'outside-press') skipNextRefocus()

				closeCalendar()
			} else {
				openCalendar()
			}
		},
		[closeCalendar, openCalendar, skipNextRefocus],
	)

	const showClear = rangeStart === null && value != null

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	const onFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
		},
		[handleClear],
	)

	const { refs, floatingStyles, context, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
		role: 'dialog',
	})

	// Captures the trigger for `useA11yFocusReturn`; `FloatingFocusManager`
	// runs with `returnFocus={false}` so manual restoration is required.
	const setReference = useCallback(
		(node: HTMLElement | null) => {
			captureTrigger(node)

			refs.setReference(node)
		},
		[captureTrigger, refs],
	)

	const setActive = useCallback(
		(next: CalendarActive | null) => dispatch({ type: 'setActive', active: next }),
		[],
	)

	const onHoverDate = useCallback((date: Date | null) => dispatch({ type: 'hover', date }), [])

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
		displayValue: value ? formatRange(value[0], value[1]) : '',
		open,
		onOpenChange: handleOpenChange,
		onTriggerKeyDown,
		onExitComplete: flushPending,
		setReference,
		setFloating: refs.setFloating,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
		calendar: {
			rangeStart: rangeStart ?? (value ? value[0] : null),
			rangeEnd: rangeStart === null ? (value ? value[1] : null) : null,
			hoverDate: rangeStart !== null ? hoverDate : null,
			onHoverDate,
			onValueChange: handleSelect,
			active: open ? active : null,
			calendarRef,
			footerRef,
		},
		footer: {
			active,
			footerButtons,
			onClear: handleClear,
			footerRef,
			onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => calendarRef.current?.footerKeyDown(e),
		},
	}
}
