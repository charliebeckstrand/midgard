import { useCallback, useRef, useState } from 'react'

type UseCalendarMonthOptions = {
	value: Date | null | undefined
	defaultValue?: Date
	activeGridDate: Date | null
}

/**
 * Owns the calendar's `viewDate` (the month/year currently rendered) and the
 * rules that re-anchor it when `value` or the `active` grid date moves to a
 * different month. The re-anchor happens during render via prev-ref tracking
 * — not in a `useEffect` — to avoid an extra render cycle when the prop
 * change should already have switched the visible month.
 */
export function useCalendarMonth({ value, defaultValue, activeGridDate }: UseCalendarMonthOptions) {
	const [viewDate, setViewDate] = useState(() => {
		const seed = value ?? defaultValue ?? new Date()

		return new Date(seed.getFullYear(), seed.getMonth(), 1)
	})

	const year = viewDate.getFullYear()

	const month = viewDate.getMonth()

	const prevMonth = useCallback(() => {
		setViewDate(new Date(year, month - 1, 1))
	}, [year, month])

	const nextMonth = useCallback(() => {
		setViewDate(new Date(year, month + 1, 1))
	}, [year, month])

	const navigateTo = useCallback((y: number, m: number) => {
		setViewDate(new Date(y, m, 1))
	}, [])

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

	return { viewDate, year, month, prevMonth, nextMonth, navigateTo }
}
