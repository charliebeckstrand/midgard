'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useReportedChange } from '../../hooks/use-reported-change'

import { firstOfMonth } from './calendar-utilities'

/** Whether two rendered months are the same instant; `firstOfMonth` mints a fresh `Date` each call. @internal */
function sameInstant(a: Date, b: Date): boolean {
	return a.getTime() === b.getTime()
}

/** First of the month that holds `date`. @internal */
function monthOf(date: Date): Date {
	return firstOfMonth(date.getFullYear(), date.getMonth())
}

/** Options for {@link useCalendarMonth}: the bound `value`, initial `defaultValue` seed, and the roving-focus grid date that pulls the view along. @internal */
type CalendarMonthOptions = {
	value: Date | null | undefined
	defaultValue?: Date
	activeGridDate: Date | null
	onMonthChange?: (month: Date) => void
}

/** The `value` and the roved grid date that the view last followed. @internal */
type CalendarMonthAnchors = {
	value: Date | null | undefined
	activeGridDate: Date | null
}

/** Whether two values hold the same instant, or are both empty. @internal */
function sameValue(a: Date | null | undefined, b: Date | null | undefined): boolean {
	if (a == null || b == null) return a == null && b == null

	return sameInstant(a, b)
}

/** The month that `date` moves the view to, or `null` when the view shows it already. @internal */
function reanchor(date: Date | null | undefined, viewDate: Date): Date | null {
	if (!date) return null

	const month = monthOf(date)

	return sameInstant(month, viewDate) ? null : month
}

/**
 * Owns the calendar's `viewDate`, the month/year currently rendered. It also owns
 * the rules that re-anchor it when `value` or the `active` grid date moves to a
 * different month. The re-anchor happens during render, from the anchors of the
 * last render in state, not in a `useEffect`; it costs no extra commit.
 *
 * @returns `viewDate` (first of the rendered month), its `year`/`month`
 * (0-based), and the `prevMonth`/`nextMonth`/`navigateTo` view steppers. The
 * steppers keep their identity, and each step applies to the last one, so two
 * calls in one event move two months.
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
	const [viewDate, setViewDate] = useState(() => monthOf(value ?? defaultValue ?? new Date()))

	// A clock-seeded view can differ between the server render and the client
	// (timezone offset, month boundary); the sibling `today` waits for hydration
	// for the same mismatch. The state seed stays synchronous and SSR paints a
	// month; this effect corrects any drift once after mount.
	const clockSeeded = useRef(value == null && defaultValue == null)

	useEffect(() => {
		if (!clockSeeded.current) return

		clockSeeded.current = false

		const now = monthOf(new Date())

		setViewDate((prev) => (sameInstant(prev, now) ? prev : now))
	}, [])

	const year = viewDate.getFullYear()

	const month = viewDate.getMonth()

	const prevMonth = useCallback(() => {
		setViewDate((prev) => firstOfMonth(prev.getFullYear(), prev.getMonth() - 1))
	}, [])

	const nextMonth = useCallback(() => {
		setViewDate((prev) => firstOfMonth(prev.getFullYear(), prev.getMonth() + 1))
	}, [])

	const navigateTo = useCallback((y: number, m: number) => {
		setViewDate(firstOfMonth(y, m))
	}, [])

	// The anchors live in state, not in a ref. A render that React discards
	// then discards its anchors too, and the React Compiler can compile the hook.
	const [anchors, setAnchors] = useState<CalendarMonthAnchors>({ value, activeGridDate })

	// A `value` moves when its instant changes, so a parent that passes an equal
	// `Date` again on each render keeps the view. The grid date moves on each new
	// object, because the parent sends one for each keyboard move. A move that
	// the parent clamps to the same day must still bring the roved day into view.
	const valueMoved = !sameValue(anchors.value, value)

	const gridMoved = activeGridDate !== anchors.activeGridDate

	if (valueMoved || gridMoved) {
		setAnchors({ value, activeGridDate })

		// The value wins when both move to a different month.
		const next =
			(valueMoved ? reanchor(value, viewDate) : null) ??
			(gridMoved ? reanchor(activeGridDate, viewDate) : null)

		if (next) setViewDate(next)
	}

	/*
	 * One report for each month the calendar renders, read from the committed
	 * `viewDate`.
	 *
	 * Five routes write that state: the two steppers, `navigateTo`, the mount
	 * drift correction, and the render-phase re-anchor. No single call
	 * site is the transition. Compared by instant rather than identity, because
	 * `navigateTo` mints a fresh `Date` even when the reader re-picks the rendered
	 * month. The mount announces nothing; the drift correction after hydration does
	 * report, because the month on screen genuinely changed.
	 */
	useReportedChange(viewDate, onMonthChange, sameInstant)

	return { viewDate, year, month, prevMonth, nextMonth, navigateTo }
}
