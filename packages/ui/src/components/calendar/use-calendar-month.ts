'use client'

import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'

import { firstOfMonth } from './calendar-utilities'

/** Options for {@link useCalendarMonth}: the bound `value`, initial `defaultValue` seed, and the roving-focus grid date that pulls the view along. @internal */
type CalendarMonthOptions = {
	value: Date | null | undefined
	defaultValue?: Date
	activeGridDate: Date | null
	onMonthChange?: (month: Date) => void
}

/**
 * Owns the calendar's `viewDate` (the month/year currently rendered) and the
 * rules that re-anchor it when `value` or the `active` grid date moves to a
 * different month. The re-anchor happens during render via prev-ref tracking,
 * not in a `useEffect`; it costs no extra render cycle.
 *
 * @returns `viewDate` (first of the rendered month), its `year`/`month`
 * (0-based), and the `prevMonth`/`nextMonth`/`navigateTo` view steppers.
 * @remarks A clock-seeded view (no `value`/`defaultValue`) renders a
 * server-safe month synchronously, then a mount effect corrects any
 * day-boundary or timezone drift once after hydration.
 */
export function useCalendarMonth({
	value,
	defaultValue,
	activeGridDate,
	onMonthChange,
}: CalendarMonthOptions) {
	const [viewDate, setViewDate] = useState(() => {
		const seed = value ?? defaultValue ?? new Date()

		return firstOfMonth(seed.getFullYear(), seed.getMonth())
	})

	// A clock-seeded view can differ between the server render and the client
	// (timezone offset, month boundary); the sibling `today` defers to a mount
	// effect for the same mismatch. The state seed stays synchronous and SSR
	// paints a month; this effect corrects any drift once after mount.
	const clockSeeded = useRef(value == null && defaultValue == null)

	useEffect(() => {
		if (!clockSeeded.current) return

		clockSeeded.current = false

		const now = new Date()

		setViewDate((prev) =>
			prev.getFullYear() === now.getFullYear() && prev.getMonth() === now.getMonth()
				? prev
				: firstOfMonth(now.getFullYear(), now.getMonth()),
		)
	}, [])

	const year = viewDate.getFullYear()

	const month = viewDate.getMonth()

	const prevMonth = useCallback(() => {
		setViewDate(firstOfMonth(year, month - 1))
	}, [year, month])

	const nextMonth = useCallback(() => {
		setViewDate(firstOfMonth(year, month + 1))
	}, [year, month])

	const navigateTo = useCallback((y: number, m: number) => {
		setViewDate(firstOfMonth(y, m))
	}, [])

	const prevActiveGridDateRef = useRef(activeGridDate)

	const prevValueRef = useRef(value)

	if (activeGridDate && activeGridDate !== prevActiveGridDateRef.current) {
		const next = firstOfMonth(activeGridDate.getFullYear(), activeGridDate.getMonth())

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
			setViewDate(firstOfMonth(value.getFullYear(), value.getMonth()))
		}
	}

	prevValueRef.current = value

	/*
	 * One report for each month the calendar renders, read from the committed
	 * `viewDate`.
	 *
	 * Five routes write that state — the two steppers, `navigateTo`, the mount
	 * drift correction, and the two render-phase re-anchors — so no single call
	 * site is the transition. The ref seeds from the first rendered month, so a
	 * mount announces nothing; the drift correction after hydration does report,
	 * because the month on screen genuinely changed.
	 */
	const notifyMonthChange = useEffectEvent((next: Date) => {
		onMonthChange?.(next)
	})

	const reportedMonthRef = useRef(viewDate)

	useEffect(() => {
		if (reportedMonthRef.current.getTime() === viewDate.getTime()) return

		reportedMonthRef.current = viewDate

		notifyMonthChange(viewDate)
	}, [viewDate])

	return { viewDate, year, month, prevMonth, nextMonth, navigateTo }
}
