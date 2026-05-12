'use client'

import type { Placement } from '@floating-ui/react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useIdScope } from '../../hooks/use-id-scope'
import { kokkaku } from '../../recipes'
import { Calendar, type CalendarActive, type CalendarHandle } from '../calendar'
import { useControl } from '../control/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { DatePickerFooter } from './datepicker-footer'
import { DatePickerRange } from './datepicker-range'
import { DatePickerShell, noopPickerOpenChange } from './shell'
import { type FooterButton, useDatePickerKeyDown } from './use-keyboard'
import { addDays, clampDate, formatDate } from './utilities'

export type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onChange?: (value: Date | undefined) => void
}

export type DatePickerRangeProps = {
	range: true
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onChange?: (value: [Date, Date] | undefined) => void
}

export type DatePickerBaseProps = {
	min?: Date
	max?: Date
	placeholder?: string
	placement?: Placement
	className?: string
	disabled?: boolean
}

export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps)

export function DatePicker(props: DatePickerProps) {
	const control = useControl()
	const skeleton = useSkeleton()

	if (skeleton) {
		const size = control?.size ?? 'md'

		return (
			<Placeholder
				className={cn(kokkaku.formControl.base, kokkaku.formControl.size[size], props.className)}
			/>
		)
	}

	if (props.range) {
		return <DatePickerRange {...props} />
	}

	return <DatePickerSingle {...props} />
}

function DatePickerSingle({
	value: valueProp,
	defaultValue,
	onChange,
	min,
	max,
	placeholder = 'Select a date',
	placement = 'bottom-start',
	className,
	disabled = false,
}: DatePickerBaseProps & DatePickerSingleProps) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })

	const [open, setOpen] = useState(false)

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
		(nextOpen: boolean) => {
			if (nextOpen) {
				openCalendar()
			} else {
				closeCalendar()
			}
		},
		[closeCalendar, openCalendar],
	)

	const handleFooterActivate = useCallback(
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

	const displayValue = value ? formatDate(value) : ''

	const handleInputKeyDown = useDatePickerKeyDown({
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
		onFooterActivate: handleFooterActivate,
	})

	return (
		<DatePickerShell
			open={open}
			onOpenChange={handleOpenChange}
			placement={placement}
			triggerId={scope.id}
			displayValue={displayValue}
			placeholder={placeholder}
			disabled={disabled}
			onTriggerKeyDown={handleInputKeyDown}
			className={className}
		>
			<Calendar
				ref={calendarRef}
				value={value ?? null}
				onChange={handleSelect}
				min={min}
				max={max}
				active={open ? active : null}
				onPickerOpenChange={noopPickerOpenChange}
				footerRef={footerRef}
			/>
			<DatePickerFooter
				active={active}
				footerButtons={footerButtons}
				onClear={handleClear}
				onToday={handleSelectToday}
				footerRef={footerRef}
				onKeyDown={(e) => calendarRef.current?.footerKeyDown(e)}
			/>
		</DatePickerShell>
	)
}
