'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'

import { useFloatingUI } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useIdScope } from '../../hooks/use-id-scope'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControl } from '../control/context'
import type { DatePickerBaseProps, DatePickerSingleProps } from './date-picker'
import { addDays, clampDate, formatDate } from './date-picker-utilities'
import { type FooterButton, useDatePickerKeyboard } from './use-date-picker-keyboard'
import { useDatePickerRefocus } from './use-date-picker-refocus'

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

	const [value, setValue] = useControllable({
		value: valueProp,
		defaultValue,
		onValueChange,
	})

	const [open, setOpen] = useState(false)

	const { captureTrigger, skipNextRefocus } = useDatePickerRefocus(open)

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
		(nextOpen: boolean, _event?: Event, reason?: OpenChangeReason) => {
			if (nextOpen) {
				openCalendar()
			} else {
				if (reason === 'outside-press') skipNextRefocus()

				closeCalendar()
			}
		},
		[closeCalendar, openCalendar, skipNextRefocus],
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
	})

	// FloatingFocusManager runs with `returnFocus={false}`; capture the trigger so
	// useDatePickerRefocus can restore focus to it on close.
	const setReference = useCallback(
		(node: HTMLElement | null) => {
			captureTrigger(node)

			refs.setReference(node)
		},
		[captureTrigger, refs],
	)

	const onTriggerKeyDown = useDatePickerKeyboard({
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
		describedBy: control?.describedBy,
		displayValue: value ? formatDate(value) : '',
		open,
		onOpenChange: handleOpenChange,
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
