'use client'

import { useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Calendar, type CalendarDayContext } from './calendar'
import { isBeforeDay, isBetween, isSameDay } from './calendar-utilities'

const k = katachi.calendar

export type CalendarRangeProps = {
	onChange?: (date: Date) => void
	onClear?: () => void
	min?: Date
	max?: Date
	rangeStart?: Date | null
	rangeEnd?: Date | null
	hoverDate?: Date | null
	onHoverDate?: (date: Date | null) => void
	activeDate?: Date | null
	className?: string
}

export function CalendarRange({
	onChange,
	onClear,
	min,
	max,
	rangeStart,
	rangeEnd,
	hoverDate,
	onHoverDate,
	activeDate,
	className,
}: CalendarRangeProps) {
	const effectiveEnd = hoverDate ?? rangeEnd

	const getDayProps = useCallback(
		(ctx: CalendarDayContext) => {
			const { date } = ctx

			const isRangeStart = rangeStart != null && isSameDay(date, rangeStart)
			const isRangeEnd = effectiveEnd != null && isSameDay(date, effectiveEnd)
			const isEdge = isRangeStart || isRangeEnd

			const hasRange = rangeStart != null && effectiveEnd != null
			const inRange = hasRange && isBetween(date, rangeStart, effectiveEnd)

			const startBeforeEnd = hasRange && isBeforeDay(rangeStart, effectiveEnd)
			const endBeforeStart = hasRange && isBeforeDay(effectiveEnd, rangeStart)

			const isLeftEdge = (startBeforeEnd && isRangeStart) || (endBeforeStart && isRangeEnd)
			const isRightEdge = (startBeforeEnd && isRangeEnd) || (endBeforeStart && isRangeStart)

			const isInnerRange = inRange && !isEdge

			return {
				selected: isEdge,
				variant: isInnerRange ? ('soft' as const) : undefined,
				color: isInnerRange ? ('blue' as const) : undefined,
				className: cn(
					isInnerRange && 'rounded-none',
					isLeftEdge && k.day.rangeLeftEdge,
					isRightEdge && k.day.rangeRightEdge,
				),
				onMouseEnter: () => onHoverDate?.(date),
				onMouseLeave: () => onHoverDate?.(null),
			}
		},
		[rangeStart, effectiveEnd, onHoverDate],
	)

	const defaultValue = useMemo(() => {
		if (rangeStart)
			return new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate())

		if (rangeEnd) return new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate())

		return undefined
	}, [rangeStart, rangeEnd])

	return (
		<Calendar
			value={undefined}
			defaultValue={defaultValue}
			onChange={onChange}
			onClear={onClear}
			min={min}
			max={max}
			activeDate={activeDate}
			getDayProps={getDayProps}
			showToday={false}
			showClear={rangeStart != null && rangeEnd != null}
			className={className}
		/>
	)
}
