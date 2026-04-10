'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { katachi } from '../../recipes'
import { Button, type ButtonVariants } from '../button'
import { CalendarPicker } from './calendar-picker'
import { getCalendarDays, isBeforeDay, isSameDay, WEEKDAYS } from './calendar-utilities'
import { useKeyboard } from './use-keyboard'

const k = katachi.calendar

export type CalendarActive =
	| { zone: 'header'; index: 0 | 1 | 2 }
	| { zone: 'grid'; date: Date }
	| { zone: 'footer'; index: number }

export type CalendarHandle = {
	prevMonth: () => void
	nextMonth: () => void
	openPicker: () => void
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
	onChange?: (date: Date) => void
	min?: Date
	max?: Date
	active?: CalendarActive | null
	onPickerOpenChange?: (open: boolean) => void
	getDayProps?: (ctx: CalendarDayContext) => CalendarDayProps
	className?: string
}

export const Calendar = forwardRef<CalendarHandle, CalendarProps>(function Calendar(
	{
		value: valueProp,
		defaultValue,
		onChange,
		min,
		max,
		active,
		onPickerOpenChange,
		getDayProps,
		className,
	},
	ref,
) {
	const handleValueChange = useCallback(
		(nextValue: Date | undefined) => {
			if (nextValue) onChange?.(nextValue)
		},
		[onChange],
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

	useImperativeHandle(ref, () => ({ prevMonth, nextMonth, openPicker }), [
		prevMonth,
		nextMonth,
		openPicker,
	])

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

	const handleHeaderKeyDown = useKeyboard(headerRef)
	const handleGridKeyDown = useKeyboard(gridRef, 7)

	const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

	const handlePickerNavigate = useCallback((y: number, m: number) => {
		setViewDate(new Date(y, m, 1))
	}, [])

	const activeGridDate = active?.zone === 'grid' ? active.date : null

	useEffect(() => {
		if (!activeGridDate) return

		setViewDate((prev) => {
			const next = new Date(activeGridDate.getFullYear(), activeGridDate.getMonth(), 1)

			return next.getTime() === prev.getTime() ? prev : next
		})
	}, [activeGridDate])

	useEffect(() => {
		if (!value) return

		setViewDate((prev) => {
			if (value.getFullYear() === prev.getFullYear() && value.getMonth() === prev.getMonth())
				return prev

			return new Date(value.getFullYear(), value.getMonth(), 1)
		})
	}, [value])

	const headerActiveIndex = active?.zone === 'header' ? active.index : null

	return (
		<div data-slot="calendar" className={cn(k.root, className)}>
			<div ref={headerRef} role="toolbar" onKeyDown={handleHeaderKeyDown} className={k.header}>
				<Button
					variant="plain"
					onClick={prevMonth}
					aria-label="Previous month"
					className={cn(headerActiveIndex === 0 && k.day.active)}
				>
					<ChevronLeft className={k.navIcon} />
				</Button>
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
					className={cn(headerActiveIndex === 2 && k.day.active)}
				>
					<ChevronRight className={k.navIcon} />
				</Button>
			</div>

			<div className={k.grid}>
				{WEEKDAYS.map((day) => (
					<div key={day} className={cn(k.weekday)} aria-hidden="true">
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
						if (date.getMonth() !== month) return null

						const disabled = isDisabled(date)

						const isToday = isSameDay(date, today)

						const isSelected = value != null && isSameDay(date, value)

						const isActive = activeGridDate != null && isSameDay(date, activeGridDate)

						const dayProps = getDayProps?.({ date, disabled, isToday, isSelected, isActive })

						const selected = dayProps?.selected ?? isSelected

						const isFirst = date.getDate() === 1

						return (
							<Button
								key={date.toISOString()}
								variant={dayProps?.variant ?? (selected ? 'solid' : isToday ? 'soft' : 'plain')}
								color={dayProps?.color ?? (selected || isToday ? 'blue' : undefined)}
								aria-pressed={selected}
								disabled={disabled}
								onClick={() => {
									if (!disabled) setValue(date)
								}}
								onMouseEnter={dayProps?.onMouseEnter}
								onMouseLeave={dayProps?.onMouseLeave}
								style={
									isFirst ? { gridColumnStart: new Date(year, month, 1).getDay() + 1 } : undefined
								}
								className={cn(
									isActive && (selected ? k.day.activeSelected : k.day.active),
									dayProps?.className,
								)}
							>
								{date.getDate()}
							</Button>
						)
					})}
				</div>
			</div>
		</div>
	)
})
