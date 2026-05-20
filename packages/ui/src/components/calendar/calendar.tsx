'use client'

import {
	type KeyboardEvent,
	type Ref,
	type RefObject,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { Density, useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/calendar'
import type { Step } from '../../recipes/ryu/sun'
import type { ButtonVariants } from '../button'
import { CalendarGrid } from './calendar-grid'
import { CalendarHeader } from './calendar-header'
import { getCalendarDays, isBeforeDay } from './calendar-utilities'
import { useCalendarFocus } from './use-calendar-focus'
import { useCalendarMonth } from './use-calendar-month'

export type CalendarActive =
	| { zone: 'header'; index: 0 | 1 | 2 }
	| { zone: 'grid'; date: Date }
	| { zone: 'footer'; index: number }

export type CalendarHandle = {
	prevMonth: () => void
	nextMonth: () => void
	openPicker: () => void
	footerKeyDown: (e: KeyboardEvent) => void
}

export type CalendarDayContext = {
	date: Date
	disabled: boolean
	today: boolean
	selected: boolean
	active: boolean
}

export type CalendarDayProps = {
	selected?: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

export type CalendarProps = {
	value?: Date | null
	defaultValue?: Date
	onValueChange?: (date: Date) => void
	min?: Date
	max?: Date
	active?: CalendarActive | null
	onPickerOpenChange?: (open: boolean) => void
	getDayProps?: (context: CalendarDayContext) => CalendarDayProps
	footerRef?: RefObject<HTMLElement | null>
	ref?: Ref<CalendarHandle>
	/**
	 * Size step that drives overall width, padding, and the weekday label size.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 * Re-broadcast to descendants via the Density context so the nav buttons and
	 * day cells inherit consistently.
	 */
	size?: Step
	className?: string
}

/** Single-date month-grid picker — exposes navigation, focus, and picker handles to a parent via `ref` for embedded use. */
export function Calendar({
	value: valueProp,
	defaultValue,
	onValueChange,
	min,
	max,
	active,
	onPickerOpenChange,
	getDayProps,
	footerRef,
	ref,
	size,
	className,
}: CalendarProps) {
	const inherited = useDensity()

	const resolvedSize: Step = size ?? inherited.size

	const handleValueChange = useCallback(
		(nextValue: Date | undefined) => {
			if (nextValue) onValueChange?.(nextValue)
		},
		[onValueChange],
	)

	const [value, setValue] = useControllable({
		value: valueProp,
		defaultValue,
		onValueChange: handleValueChange,
	})

	const today = useMemo(() => new Date(), [])

	const activeGridDate = active?.zone === 'grid' ? active.date : null

	const { viewDate, year, month, prevMonth, nextMonth, navigateTo } = useCalendarMonth({
		value,
		defaultValue,
		activeGridDate,
	})

	const days = useMemo(() => getCalendarDays(year, month), [year, month])

	const [pickerOpen, setPickerOpen] = useState(false)

	const handlePickerOpenChange = useCallback(
		(open: boolean) => {
			setPickerOpen(open)
			onPickerOpenChange?.(open)
		},
		[onPickerOpenChange],
	)

	const openPicker = useCallback(() => {
		handlePickerOpenChange(true)
	}, [handlePickerOpenChange])

	const isDisabled = useCallback(
		(date: Date) => {
			if (min && isBeforeDay(date, min)) return true
			if (max && isBeforeDay(max, date)) return true

			return false
		},
		[min, max],
	)

	const headerRef = useRef<HTMLDivElement>(null)
	const gridRef = useRef<HTMLDivElement>(null)

	const { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown } = useCalendarFocus({
		headerRef,
		gridRef,
		footerRef,
	})

	useImperativeHandle(
		ref,
		() => ({ prevMonth, nextMonth, openPicker, footerKeyDown: handleFooterKeyDown }),
		[prevMonth, nextMonth, openPicker, handleFooterKeyDown],
	)

	const handleSelect = useCallback(
		(date: Date) => {
			setValue(date)
		},
		[setValue],
	)

	const firstDayColumn = new Date(year, month, 1).getDay() + 1

	const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

	const headerActiveIndex = active?.zone === 'header' ? active.index : null

	return (
		<Density density={resolvedSize} size={resolvedSize}>
			<div
				data-slot="calendar"
				data-step={resolvedSize}
				className={cn(k.base({ size: resolvedSize }), className)}
			>
				<CalendarHeader
					headerRef={headerRef}
					onHeaderKeyDown={handleHeaderKeyDown}
					size={resolvedSize}
					activeIndex={headerActiveIndex}
					year={year}
					month={month}
					today={today}
					monthLabel={monthLabel}
					pickerOpen={pickerOpen}
					onPickerOpenChange={handlePickerOpenChange}
					onPickerNavigate={navigateTo}
					onPrevMonth={prevMonth}
					onNextMonth={nextMonth}
				/>

				<CalendarGrid
					gridRef={gridRef}
					onGridKeyDown={handleGridKeyDown}
					size={resolvedSize}
					days={days}
					firstDayColumn={firstDayColumn}
					today={today}
					value={value}
					activeGridDate={activeGridDate}
					isDisabled={isDisabled}
					getDayProps={getDayProps}
					onSelect={handleSelect}
				/>
			</div>
		</Density>
	)
}
