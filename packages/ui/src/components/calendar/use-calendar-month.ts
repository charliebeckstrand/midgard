'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { firstOfMonth } from './calendar-utilities'

type CalendarMonthOptions = {
	value: Date | null | undefined
	defaultValue?: Date
	activeGridDate: Date | null
}

/**
 * Owns the calendar's `viewDate` (the month/year currently rendered) and the
 * rules that re-anchor it when `value` or the `active` grid date moves to a
 * different month. The re-anchor happens during render via prev-ref tracking,
 * not in a `useEffect`; it costs no extra render cycle.
 */
export function useCalendarMonth({ value, defaultValue, activeGridDate }: CalendarMonthOptions) {
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

	return { viewDate, year, month, prevMonth, nextMonth, navigateTo }
}
