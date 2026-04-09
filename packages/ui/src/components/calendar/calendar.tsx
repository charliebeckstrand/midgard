'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { katachi } from '../../recipes'

const k = katachi.calendar

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

function isBeforeDay(a: Date, b: Date): boolean {
	const ac = new Date(a.getFullYear(), a.getMonth(), a.getDate())
	const bc = new Date(b.getFullYear(), b.getMonth(), b.getDate())
	return ac.getTime() < bc.getTime()
}

function isBetween(date: Date, start: Date, end: Date): boolean {
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
	const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
	const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
	const lo = Math.min(s, e)
	const hi = Math.max(s, e)
	return d > lo && d < hi
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate()
}

function getCalendarDays(year: number, month: number): Date[] {
	const firstDay = new Date(year, month, 1).getDay()
	const daysInMonth = getDaysInMonth(year, month)
	const days: Date[] = []

	// Padding days from previous month
	for (let i = firstDay - 1; i >= 0; i--) {
		days.push(new Date(year, month, -i))
	}

	for (let d = 1; d <= daysInMonth; d++) {
		days.push(new Date(year, month, d))
	}

	return days
}

export type CalendarProps = {
	value?: Date
	defaultValue?: Date
	onChange?: (date: Date) => void
	min?: Date
	max?: Date
	rangeStart?: Date | null
	rangeEnd?: Date | null
	hoverDate?: Date | null
	onHoverDate?: (date: Date | null) => void
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
	className,
}: CalendarProps) {
	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })

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

	const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

	return (
		<div data-slot="calendar" className={cn(k.root, className)}>
			<div className={k.header}>
				<button type="button" onClick={prevMonth} className={cn(k.nav)} aria-label="Previous month">
					<ChevronLeft className="size-4" />
				</button>
				<span className={cn(k.title)}>{monthLabel}</span>
				<button type="button" onClick={nextMonth} className={cn(k.nav)} aria-label="Next month">
					<ChevronRight className="size-4" />
				</button>
			</div>

			<div className={k.grid}>
				{WEEKDAYS.map((day) => (
					<div key={day} className={cn(k.weekday)} aria-hidden="true">
						{day}
					</div>
				))}

				{days.map((date) => {
					const isOutside = date.getMonth() !== month
					if (isOutside) {
						return <div key={date.toISOString()} className={cn(k.day.base, k.day.outside)} />
					}

					const disabled = isDisabled(date)
					const isToday = isSameDay(date, today)
					const isSelected = value != null && isSameDay(date, value)
					const isRangeStart = rangeStart != null && isSameDay(date, rangeStart)
					const isRangeEnd = effectiveEnd != null && isSameDay(date, effectiveEnd)
					const isEdge = isRangeStart || isRangeEnd
					const inRange =
						rangeStart != null && effectiveEnd != null && isBetween(date, rangeStart, effectiveEnd)

					return (
						<button
							key={date.toISOString()}
							type="button"
							tabIndex={-1}
							disabled={disabled}
							aria-pressed={isSelected || isEdge}
							onClick={() => {
								if (!disabled) setValue(date)
							}}
							onMouseEnter={() => onHoverDate?.(date)}
							onMouseLeave={() => onHoverDate?.(null)}
							className={cn(
								k.day.base,
								!disabled && !isSelected && !isEdge && !inRange && k.day.hover,
								isToday && !isSelected && !isEdge && k.day.today,
								isSelected && !rangeStart && k.day.selected,
								isEdge && k.day.rangeEdge,
								inRange && !isEdge && k.day.inRange,
								disabled && k.day.disabled,
							)}
						>
							{date.getDate()}
						</button>
					)
				})}
			</div>
		</div>
	)
}
