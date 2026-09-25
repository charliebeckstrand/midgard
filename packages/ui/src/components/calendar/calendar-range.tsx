'use client'

import { type Ref, type RefObject, useCallback } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import { memoWeak } from '../../utilities'
import {
	Calendar,
	type CalendarActive,
	type CalendarDayContextValue,
	type CalendarDayProps,
	type CalendarHandle,
} from './calendar'
import { isBeforeDay, isBetween, isSameDay } from './calendar-utilities'

/** Props for {@link CalendarRange}: the controlled `rangeStart`/`rangeEnd` endpoints, hover-date tracking, bounds, locale/size, and `ref`. */
export type CalendarRangeProps = {
	/**
	 * Fires with the day the reader clicked.
	 *
	 * @remarks
	 * An event, not the `on<State>Change` echo the name suggests. The endpoint
	 * state machine lives in DatePicker. This reports a raw click rather than a
	 * settled range. Sibling `Calendar.onValueChange` does echo bound state, so
	 * the two read alike and behave differently. Renaming it `onDayClick` waits
	 * for the next breaking pass.
	 */
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
	/** Forwarded to `<Calendar>`. Fires with the first of the month the grid renders. */
	onMonthChange?: (month: Date) => void
	active?: CalendarActive | null
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
	const isEdge =
		(rangeStart != null && isSameDay(date, rangeStart)) ||
		(effectiveEnd != null && isSameDay(date, effectiveEnd))

	if (rangeStart == null || effectiveEnd == null) {
		return { isEdge, isInnerRange: false, isLeftEdge: false, isRightEdge: false }
	}

	// The earlier endpoint is the left edge, in either selection order.
	const [first, last] = isBeforeDay(effectiveEnd, rangeStart)
		? [effectiveEnd, rangeStart]
		: [rangeStart, effectiveEnd]

	// A range of one day has no band, so its cell keeps each corner round.
	const spans = isBeforeDay(first, last)

	return {
		isEdge,
		isInnerRange: isBetween(date, first, last),
		isLeftEdge: spans && isSameDay(date, first),
		isRightEdge: spans && isSameDay(date, last),
	}
}

/**
 * The enter handler of each rendered day, for each `onHoverDate`. The inner map
 * keys each handler on the `Date` of its cell, not on the day number. The
 * calendar keeps one `Date` for each day while it renders that month. When the
 * month leaves the view, its `Date`s and their handlers go too.
 */
const enterHandlers = new WeakMap<(date: Date | null) => void, WeakMap<Date, () => void>>()

/** The leave handler, for each `onHoverDate`. */
const leaveHandlers = new WeakMap<(date: Date | null) => void, () => void>()

/**
 * The hover handlers of a day cell. Each handler keeps its identity for the same
 * `onHoverDate` and the same day while that month renders. A memoized cell then
 * holds when the band moves past it.
 */
function hoverHandlers(
	onHoverDate: ((date: Date | null) => void) | undefined,
	date: Date,
): Pick<CalendarDayProps, 'onMouseEnter' | 'onMouseLeave'> {
	if (!onHoverDate) return {}

	const byDay = memoWeak(enterHandlers, onHoverDate, () => new WeakMap<Date, () => void>())

	return {
		onMouseEnter: memoWeak(byDay, date, (day) => () => onHoverDate(day)),
		onMouseLeave: memoWeak(leaveHandlers, onHoverDate, (report) => () => report(null)),
	}
}

/**
 * Range-aware variant of {@link Calendar}. Drives the underlying calendar's
 * per-day styling through `getDayProps`. It paints the band between
 * `rangeStart` and the effective end, marks both endpoints selected, and rounds
 * the leading and trailing edges in either selection order. The effective end
 * is the `hoverDate` preview when set, else `rangeEnd`. Hover over a day
 * reports it through `onHoverDate` for live in-progress feedback. Endpoint
 * state is fully controlled by the parent. When the parent moves `rangeStart`
 * (else `rangeEnd`) to another month, the view follows it. Forwards `locale`,
 * `size`, bounds, and the imperative `ref` to `Calendar`.
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
	onMonthChange,
	active,
	footerRef,
	ref,
	locale,
	size,
	className,
}: CalendarRangeProps) {
	const effectiveEnd = hoverDate ?? rangeEnd

	const getDayProps = useCallback(
		(context: CalendarDayContextValue): CalendarDayProps => {
			const { date } = context

			const { isEdge, isInnerRange, isLeftEdge, isRightEdge } = computeRangeDayFlags(
				date,
				rangeStart,
				effectiveEnd,
			)

			return {
				selected: isEdge,
				variant: isInnerRange ? 'soft' : undefined,
				color: isInnerRange ? 'blue' : undefined,
				className: cn(
					isInnerRange && 'rounded-none',
					isLeftEdge && k.day.range.leftEdge,
					isRightEdge && k.day.range.rightEdge,
				),
				...hoverHandlers(onHoverDate, date),
			}
		},
		[rangeStart, effectiveEnd, onHoverDate],
	)

	return (
		<Calendar
			ref={ref}
			// The first endpoint anchors the view, so the grid follows a parent that
			// moves the range to another month. `getDayProps` owns the selection.
			value={rangeStart ?? rangeEnd ?? null}
			onValueChange={(date) => date && onValueChange?.(date)}
			min={min}
			max={max}
			active={active}
			onMonthChange={onMonthChange}
			getDayProps={getDayProps}
			footerRef={footerRef}
			locale={locale}
			size={size}
			className={className}
		/>
	)
}
