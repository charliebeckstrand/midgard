'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { katachi } from '../../recipes'
import { Button } from '../button'
import { CalendarPicker } from './calendar-picker'
import { getCalendarDays, isBeforeDay, isBetween, isSameDay, WEEKDAYS } from './calendar-utilities'
import { useKeyboard } from './use-keyboard'

const k = katachi.calendar

export type CalendarProps = {
	value?: Date | null
	defaultValue?: Date
	onChange?: (date: Date) => void
	min?: Date
	max?: Date
	rangeStart?: Date | null
	rangeEnd?: Date | null
	hoverDate?: Date | null
	onHoverDate?: (date: Date | null) => void
	activeDate?: Date | null
	className?: string
}

export function Calendar({
	value: valueProp,
	defaultValue,
	onChange,
	min,
	max,
	rangeStart,
	rangeEnd,
	hoverDate,
	onHoverDate,
	activeDate,
	className,
}: CalendarProps) {
	const handleValueChange = useCallback(
		(nextValue: Date | undefined) => {
			if (nextValue === undefined) return

			onChange?.(nextValue)
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

	const isDisabled = useCallback(
		(date: Date) => {
			if (min && isBeforeDay(date, min)) return true
			if (max && isBeforeDay(max, date)) return true

			return false
		},
		[min, max],
	)

	const effectiveEnd = hoverDate ?? rangeEnd

	const headerRef = useRef<HTMLDivElement>(null)
	const gridRef = useRef<HTMLDivElement>(null)

	const handleHeaderKeyDown = useKeyboard(headerRef)
	const handleGridKeyDown = useKeyboard(gridRef, 7)

	const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

	const handlePickerNavigate = useCallback((y: number, m: number) => {
		setViewDate(new Date(y, m, 1))
	}, [])

	const handleSelectToday = useCallback(() => {
		setValue(today)

		setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
	}, [today, setValue])

	useEffect(() => {
		if (!activeDate) return

		setViewDate((prev) => {
			const next = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1)

			return next.getTime() === prev.getTime() ? prev : next
		})
	}, [activeDate])

	return (
		<div data-slot="calendar" className={cn(k.root, className)}>
			<div ref={headerRef} role="toolbar" onKeyDown={handleHeaderKeyDown} className={k.header}>
				<Button variant="plain" onClick={prevMonth} aria-label="Previous month">
					<ChevronLeft className={k.navIcon} />
				</Button>
				<CalendarPicker
					year={year}
					month={month}
					today={today}
					onNavigate={handlePickerNavigate}
					onSelectToday={handleSelectToday}
					monthLabel={monthLabel}
				/>
				<Button variant="plain" onClick={nextMonth} aria-label="Next month">
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
						const isOutside = date.getMonth() !== month

						if (isOutside) return null

						const disabled = isDisabled(date)

						const isToday = isSameDay(date, today)
						const isSelected = value != null && isSameDay(date, value)
						const isActive = activeDate != null && isSameDay(date, activeDate)
						const isRangeStart = rangeStart != null && isSameDay(date, rangeStart)
						const isRangeEnd = effectiveEnd != null && isSameDay(date, effectiveEnd)

						const isEdge = isRangeStart || isRangeEnd

						const inRange =
							rangeStart != null &&
							effectiveEnd != null &&
							isBetween(date, rangeStart, effectiveEnd)

						const isFirst = date.getDate() === 1

						return (
							<Button
								key={date.toISOString()}
								disabled={disabled}
								variant={isSelected || isEdge ? 'solid' : 'plain'}
								aria-pressed={isSelected || isEdge}
								onClick={() => {
									if (!disabled) setValue(date)
								}}
								onMouseEnter={() => onHoverDate?.(date)}
								onMouseLeave={() => onHoverDate?.(null)}
								data-calendar-day
								style={
									isFirst ? { gridColumnStart: new Date(year, month, 1).getDay() + 1 } : undefined
								}
								className={cn(
									!disabled && !isSelected && !isEdge && !inRange && k.day.hover,
									isActive && !isSelected && !isEdge && k.day.active,
									isToday && !isSelected && !isEdge && k.day.today,
									inRange && !isEdge && k.day.inRange,
									disabled && k.day.disabled,
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
}
