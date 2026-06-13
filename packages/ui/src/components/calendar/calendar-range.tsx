'use client'

import { type Ref, type RefObject, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import {
	Calendar,
	type CalendarActive,
	type CalendarDayContextValue,
	type CalendarHandle,
} from './calendar'
import {
	fromCalendarDate,
	isBeforeDay,
	isBetween,
	isSameDay,
	toCalendarDate,
} from './calendar-utilities'

/** Props for {@link CalendarRange}: the controlled `rangeStart`/`rangeEnd` endpoints, hover-date tracking, bounds, locale/size, and `ref`. */
export type CalendarRangeProps = {
	onValueChange?: (date: Date) => void
	min?: Date
	max?: Date
	/** Controlled first range endpoint; the band is painted from here to the effective end. */
	rangeStart?: Date | null
	/** Controlled second range endpoint; superseded by `hoverDate` while one is set for the in-progress preview. */
	rangeEnd?: Date | null
	/** Day under the pointer, used as the provisional end of the band before the second click commits `rangeEnd`. */
	hoverDate?: Date | null
	/** Reports the day entered or left so the parent can drive the `hoverDate` preview. */
	onHoverDate?: (date: Date | null) => void
	active?: CalendarActive | null
	onPickerOpenChange?: (open: boolean) => void
	footerRef?: RefObject<HTMLElement | null>
	ref?: Ref<CalendarHandle>
	/** Forwarded to `<Calendar>`. See its docs for the resolution chain. */
	locale?: string
	/** Forwarded to `<Calendar>`. See its docs for the resolution chain. */
	size?: Step
	className?: string
}

/**
 * Range-painting flags for a single day cell: which endpoint it is, whether it
 * sits inside the range, and which visual edge (honoring reversed ranges).
 *
 * @internal
 */
function computeRangeDayFlags(
	date: Date,
	rangeStart: Date | null | undefined,
	effectiveEnd: Date | null | undefined,
): { isEdge: boolean; isInnerRange: boolean; isLeftEdge: boolean; isRightEdge: boolean } {
	const isRangeStart = rangeStart != null && isSameDay(date, rangeStart)
	const isRangeEnd = effectiveEnd != null && isSameDay(date, effectiveEnd)

	const isEdge = isRangeStart || isRangeEnd

	const hasRange = rangeStart != null && effectiveEnd != null

	const inRange = hasRange && isBetween(date, rangeStart, effectiveEnd)

	const startBeforeEnd = hasRange && isBeforeDay(rangeStart, effectiveEnd)
	const endBeforeStart = hasRange && isBeforeDay(effectiveEnd, rangeStart)

	const isLeftEdge = (startBeforeEnd && isRangeStart) || (endBeforeStart && isRangeEnd)
	const isRightEdge = (startBeforeEnd && isRangeEnd) || (endBeforeStart && isRangeStart)

	return { isEdge, isInnerRange: inRange && !isEdge, isLeftEdge, isRightEdge }
}

/**
 * Range-aware variant of {@link Calendar}. Drives the underlying calendar's
 * per-day styling through `getDayProps`: paints the band between `rangeStart`
 * and the effective end (the `hoverDate` preview when set, else `rangeEnd`),
 * marks both endpoints selected, and rounds the leading/trailing edges in
 * either selection order. Hover over a day reports it through `onHoverDate`
 * for live in-progress feedback. Endpoint state is fully controlled by the
 * parent; forwards `locale`, `size`, bounds, and the imperative `ref` to
 * `Calendar`.
 *
 * @remarks Client component (`'use client'`).
 */
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
	locale,
	size,
	className,
}: CalendarRangeProps) {
	const effectiveEnd = hoverDate ?? rangeEnd

	const getDayProps = useCallback(
		(context: CalendarDayContextValue) => {
			const { date } = context

			const { isEdge, isInnerRange, isLeftEdge, isRightEdge } = computeRangeDayFlags(
				date,
				rangeStart,
				effectiveEnd,
			)

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
		if (rangeStart) return fromCalendarDate(toCalendarDate(rangeStart))

		if (rangeEnd) return fromCalendarDate(toCalendarDate(rangeEnd))

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
			locale={locale}
			size={size}
			className={className}
		/>
	)
}
