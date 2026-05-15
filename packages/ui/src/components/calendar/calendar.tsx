'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
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
import { ConcentricProvider, useResolvedSize } from '../../primitives/concentric'
import { k } from '../../recipes/kata/calendar'
import type { Step } from '../../recipes/ryu/sun'
import { Button, type ButtonVariants } from '../button'
import { Icon } from '../icon'
import { CalendarDayCell } from './calendar-day-cell'
import { CalendarPicker } from './calendar-picker'
import { getCalendarDays, isBeforeDay, isSameDay, WEEKDAYS } from './calendar-utilities'
import { useCalendarFocus } from './use-calendar-focus'

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
	isToday: boolean
	isSelected: boolean
	isActive: boolean
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
	getDayProps?: (ctx: CalendarDayContext) => CalendarDayProps
	footerRef?: RefObject<HTMLElement | null>
	ref?: Ref<CalendarHandle>
	/**
	 * Size step that drives overall width, padding, and the weekday label size.
	 * Resolution order: explicit prop, then enclosing concentric size, then `'md'`.
	 * Re-broadcast to descendants via concentric so the nav buttons and day cells
	 * inherit consistently.
	 */
	size?: Step
	className?: string
}

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
	const resolvedSize: Step = useResolvedSize(size)

	const concentricValue = useMemo(() => ({ size: resolvedSize }), [resolvedSize])

	const handleValueChange = useCallback(
		(nextValue: Date | undefined) => {
			if (nextValue) onValueChange?.(nextValue)
		},
		[onValueChange],
	)

	const [value, setValue] = useControllable({
		value: valueProp,
		defaultValue,
		onChange: handleValueChange,
	})

	const today = useMemo(() => new Date(), [])

	const [viewDate, setViewDate] = useState(
		() =>
			new Date(
				(value ?? defaultValue ?? today).getFullYear(),
				(value ?? defaultValue ?? today).getMonth(),
				1,
			),
	)

	const year = viewDate.getFullYear()

	const month = viewDate.getMonth()

	const days = useMemo(() => getCalendarDays(year, month), [year, month])

	const prevMonth = useCallback(() => {
		setViewDate(new Date(year, month - 1, 1))
	}, [year, month])

	const nextMonth = useCallback(() => {
		setViewDate(new Date(year, month + 1, 1))
	}, [year, month])

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

	const handlePickerNavigate = useCallback((y: number, m: number) => {
		setViewDate(new Date(y, m, 1))
	}, [])

	const handleSelect = useCallback(
		(date: Date) => {
			setValue(date)
		},
		[setValue],
	)

	const firstDayColumn = new Date(year, month, 1).getDay() + 1

	const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

	const activeGridDate = active?.zone === 'grid' ? active.date : null

	// Adjust viewDate during render when the driving prop changes (avoids an
	// extra render cycle that the previous useEffect approach caused).
	const prevActiveGridDateRef = useRef(activeGridDate)

	const prevValueRef = useRef(value)

	if (activeGridDate && activeGridDate !== prevActiveGridDateRef.current) {
		const next = new Date(activeGridDate.getFullYear(), activeGridDate.getMonth(), 1)

		if (next.getTime() !== viewDate.getTime()) {
			setViewDate(next)
		}
	}

	prevActiveGridDateRef.current = activeGridDate

	if (value && value !== prevValueRef.current) {
		if (
			value.getFullYear() !== viewDate.getFullYear() ||
			value.getMonth() !== viewDate.getMonth()
		) {
			setViewDate(new Date(value.getFullYear(), value.getMonth(), 1))
		}
	}
	prevValueRef.current = value

	const headerActiveIndex = active?.zone === 'header' ? active.index : null

	return (
		<ConcentricProvider value={concentricValue}>
			<div data-slot="calendar" data-step={resolvedSize} className={cn(k.base, className)}>
				<div
					ref={headerRef}
					role="toolbar"
					onKeyDown={handleHeaderKeyDown}
					className={cn(k.header({ size: resolvedSize }))}
				>
					<Button
						variant="plain"
						onClick={prevMonth}
						aria-label="Previous month"
						prefix={<Icon icon={<ChevronLeft />} />}
						className={cn(headerActiveIndex === 0 && k.day.active)}
					/>
					<CalendarPicker
						year={year}
						month={month}
						today={today}
						onNavigate={handlePickerNavigate}
						monthLabel={monthLabel}
						open={pickerOpen}
						onOpenChange={handlePickerOpenChange}
						triggerClassName={cn(headerActiveIndex === 1 && k.day.active)}
					/>
					<Button
						variant="plain"
						onClick={nextMonth}
						aria-label="Next month"
						prefix={<Icon icon={<ChevronRight />} />}
						className={cn(headerActiveIndex === 2 && k.day.active)}
					/>
				</div>

				<div className={k.grid}>
					{WEEKDAYS.map((day) => (
						<div key={day} className={cn(k.weekday({ size: resolvedSize }))} aria-hidden="true">
							{day}
						</div>
					))}

					<div
						ref={gridRef}
						role="listbox"
						onKeyDown={handleGridKeyDown}
						className="col-span-7 grid grid-cols-7"
					>
						{days.map((date) => {
							const disabled = isDisabled(date)

							const isToday = isSameDay(date, today)

							const isSelected = value != null && isSameDay(date, value)

							const isActive = activeGridDate != null && isSameDay(date, activeGridDate)

							const dayProps = getDayProps?.({ date, disabled, isToday, isSelected, isActive })

							const selected = dayProps?.selected ?? isSelected

							const gridColumnStart = date.getDate() === 1 ? firstDayColumn : undefined

							return (
								<CalendarDayCell
									key={date.toISOString()}
									date={date}
									disabled={disabled}
									isToday={isToday}
									isActive={isActive}
									selected={selected}
									variant={dayProps?.variant}
									color={dayProps?.color}
									className={dayProps?.className}
									gridColumnStart={gridColumnStart}
									onSelect={handleSelect}
									onMouseEnter={dayProps?.onMouseEnter}
									onMouseLeave={dayProps?.onMouseLeave}
								/>
							)
						})}
					</div>
				</div>
			</div>
		</ConcentricProvider>
	)
}
