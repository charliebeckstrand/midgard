'use client'

import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'

import { useFloatingUI } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useFocusTrap } from '../../hooks/use-focus-trap'
import { useIdScope } from '../../hooks/use-id-scope'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControl } from '../control/context'
import type { DatePickerBaseProps, DatePickerRangeProps, DatePickerSingleProps } from './types'
import { type FooterButton, useDatePickerKeyDown } from './use-keyboard'
import { addDays, clampDate, formatDate, formatRange } from './utilities'

/**
 * The Calendar's internal month/year picker uses its own Popover, which
 * restores focus to its own trigger on close. Datepicker keeps focus inside
 * the focus trap, so the open-change hook is intentionally a no-op.
 */
const noopPickerOpenChange = (_pickerOpen: boolean) => {}

export function useDatePickerSingleState({
	value: valueProp,
	defaultValue,
	onChange,
	min,
	max,
	placement = 'bottom-start',
	disabled = false,
}: DatePickerBaseProps & DatePickerSingleProps) {
	const control = useControl()
	const scope = useIdScope({ id: control?.id })

	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })

	const [open, setOpen] = useState(false)

	const [active, setActive] = useState<CalendarActive | null>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	const focusTrapRef = useFocusTrap(open)

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
			if (nextOpen) {
				openCalendar()
			} else {
				closeCalendar()
			}
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

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
		role: 'dialog',
	})

	const onTriggerKeyDown = useDatePickerKeyDown({
		disabled,
		open,
		active,
		setActive,
		openCalendar,
		closeCalendar,
		moveGridDate,
		getInitialActiveDate,
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate,
	})

	return {
		triggerId: scope.id,
		displayValue: value ? formatDate(value) : '',
		open,
		onOpenChange: handleOpenChange,
		onTriggerKeyDown,
		setReference: refs.setReference,
		setFloating: refs.setFloating,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		focusTrapRef,
		calendar: {
			value: value ?? null,
			onChange: handleSelect,
			active: open ? active : null,
			onPickerOpenChange: noopPickerOpenChange,
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

export function useDatePickerRangeState({
	value: valueProp,
	defaultValue,
	onChange,
	min,
	max,
	placement = 'bottom-start',
	disabled = false,
}: DatePickerBaseProps & DatePickerRangeProps) {
	const control = useControl()
	const scope = useIdScope({ id: control?.id })

	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })

	const [open, setOpen] = useState(false)

	const [rangeStart, setRangeStart] = useState<Date | null>(null)

	const [hoverDate, setHoverDate] = useState<Date | null>(null)

	const [active, setActive] = useState<CalendarActive | null>(null)

	const pendingRef = useRef<{ value: [Date, Date] | undefined } | null>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	const focusTrapRef = useFocusTrap(open)

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			setValue(pendingRef.current.value)

			pendingRef.current = null
		}

		setRangeStart(null)

		setHoverDate(null)

		setActive(null)
	}, [setValue])

	const getInitialActiveDate = useCallback(
		() => clampDate(rangeStart ?? value?.[0] ?? min ?? new Date(), min, max),
		[rangeStart, value, min, max],
	)

	const moveGridDate = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			const next = clampDate(addDays(base, delta), min, max)

			if (rangeStart !== null) setHoverDate(next)

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
				setRangeStart(date)

				setHoverDate(null)
			} else {
				const start = rangeStart

				const end = date

				const range: [Date, Date] = start.getTime() <= end.getTime() ? [start, end] : [end, start]

				// Pin both endpoints so the range stays stable through the exit animation.
				setHoverDate(end)

				pendingRef.current = { value: range }

				closeCalendar()
			}
		},
		[closeCalendar, rangeStart],
	)

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				closeCalendar()
			} else {
				openCalendar()
			}
		},
		[closeCalendar, openCalendar],
	)

	const showClear = rangeStart === null && value != null

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	const onFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
		},
		[handleClear],
	)

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
		role: 'dialog',
	})

	const onTriggerKeyDown = useDatePickerKeyDown({
		disabled,
		open,
		active,
		setActive,
		openCalendar,
		closeCalendar,
		moveGridDate,
		getInitialActiveDate,
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate,
	})

	return {
		triggerId: scope.id,
		displayValue: value ? formatRange(value[0], value[1]) : '',
		open,
		onOpenChange: handleOpenChange,
		onTriggerKeyDown,
		onExitComplete: flushPending,
		setReference: refs.setReference,
		setFloating: refs.setFloating,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		focusTrapRef,
		calendar: {
			rangeStart: rangeStart ?? (value ? value[0] : null),
			rangeEnd: rangeStart === null ? (value ? value[1] : null) : null,
			hoverDate: rangeStart !== null ? hoverDate : null,
			onHoverDate: setHoverDate,
			onChange: handleSelect,
			active: open ? active : null,
			onPickerOpenChange: noopPickerOpenChange,
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
