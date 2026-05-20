'use client'

import { type Ref, type RefObject, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import type { Step } from '../../core/recipe'
import { k } from '../../recipes/kata/calendar'
import {
	Calendar,
	type CalendarActive,
	type CalendarDayContext,
	type CalendarHandle,
} from './calendar'
import { isBeforeDay, isBetween, isSameDay } from './calendar-utilities'

export type CalendarRangeProps = {
	onValueChange?: (date: Date) => void
	min?: Date
	max?: Date
	rangeStart?: Date | null
	rangeEnd?: Date | null
	hoverDate?: Date | null
	onHoverDate?: (date: Date | null) => void
	active?: CalendarActive | null
	onPickerOpenChange?: (open: boolean) => void
	footerRef?: RefObject<HTMLElement | null>
	ref?: Ref<CalendarHandle>
	/** Forwarded to `<Calendar>`. See its docs for the resolution chain. */
	size?: Step
	className?: string
}

/** Range-aware variant of `Calendar` — paints the active range and tracks a hover date for the in-progress endpoint. */
export function CalendarRange({
	onValueChange,
	min,
	max,
	rangeStart,
	rangeEnd,
	hoverDate,
	onHoverDate,
	active,
	onPickerOpenChange,
	footerRef,
	ref,
	size,
	className,
}: CalendarRangeProps) {
	const effectiveEnd = hoverDate ?? rangeEnd

	const getDayProps = useCallback(
		(context: CalendarDayContext) => {
			const { date } = context

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
			ref={ref}
			value={undefined}
			defaultValue={defaultValue}
			onValueChange={onValueChange}
			min={min}
			max={max}
			active={active}
			onPickerOpenChange={onPickerOpenChange}
			getDayProps={getDayProps}
			footerRef={footerRef}
			size={size}
			className={className}
		/>
	)
}
