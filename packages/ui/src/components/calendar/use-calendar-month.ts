'use client'

import { useCallback, useState } from 'react'

import { useHydrated } from '../../hooks/use-hydrated'
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
 * calls in one event move two months. `shown` tells whether the markup can
 * show the month.
 * @remarks A clock-seeded view (no `value` and no `defaultValue`) reads the
 * clock of the side that renders it. Across a timezone offset at a month
 * boundary, the server and the client can read different months. Thus `shown`
 * is `false` on the server and in the hydration render, and the caller must
 * draw no month there. It is `true` in the render after hydration, which shows
 * the month of the client clock. A render that does not hydrate, such as a
 * popover that mounts on the client, gets `true` at once. It shows the month in
 * its first commit.
 */
export function useCalendarMonth({
	value,
	defaultValue,
	activeGridDate,
	onMonthChange,
}: CalendarMonthOptions) {
	// The hydration render seeds from the client clock, so the state holds the
	// month of the client from the start. Only the markup waits for hydration, as
	// the sibling `today` does. The month in state does not change when the
	// markup shows it, so nothing reports or announces it.
	const [viewDate, setViewDate] = useState(() => monthOf(value ?? defaultValue ?? new Date()))

	const hydrated = useHydrated()

	const shown = hydrated || value != null || defaultValue != null

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
	 * Four routes write that state: the two steppers, `navigateTo`, and the
	 * render-phase re-anchor. No single call site is the transition. The
	 * comparison uses the instant, not the identity, because `navigateTo` mints a
	 * fresh `Date` also when the reader picks the rendered month again. The mount
	 * reports nothing. The month that a clock-seeded view shows after hydration is
	 * part of the mount, so it reports nothing too.
	 */
	useReportedChange(viewDate, onMonthChange, sameInstant)

	return { viewDate, year, month, shown, prevMonth, nextMonth, navigateTo }
}
