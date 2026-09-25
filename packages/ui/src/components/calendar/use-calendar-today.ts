'use client'

import { useEffect, useState } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { isSameDay } from './calendar-utilities'

/** The instant of the local midnight that ends the day of `date`, in milliseconds. @internal */
function endOfDay(date: Date): number {
	const next = new Date(date)

	next.setHours(24, 0, 0, 0)

	return next.getTime()
}

/**
 * The current day for the calendar, as a `Date` that moves at local midnight.
 *
 * @returns The current day, or `null` until hydration.
 * @remarks
 * The value is `null` in the server render and in the hydration render. A
 * server-rendered "today" can mismatch the client across a day boundary or a
 * timezone offset. A client-only mount, such as a DatePicker popover, reads the
 * day in its first render and needs no second commit.
 *
 * A timer runs at the next local midnight. A browser holds the timers of a
 * hidden tab, so the hook also reads the clock when the page shows again. The
 * state changes only on a new day. The `Date` therefore keeps its identity for
 * the whole day, and a memoized header or grid does not render for it.
 * @internal
 */
export function useCalendarToday(): Date | null {
	const [today, setToday] = useState(() => new Date())

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined

		// On a new day, the new state runs this effect again, and that run sets
		// the next timer. On the same day, the check sets a new timer. A timer
		// can fire before midnight, for example after a change to the system clock.
		const check = () => {
			const now = new Date()

			if (!isSameDay(now, today)) {
				setToday(now)

				return
			}

			clearTimeout(timer)

			arm()
		}

		const arm = () => {
			timer = setTimeout(check, Math.max(0, endOfDay(today) - Date.now()))
		}

		const handleVisibility = () => {
			if (document.visibilityState === 'visible') check()
		}

		arm()

		document.addEventListener('visibilitychange', handleVisibility)

		return () => {
			clearTimeout(timer)

			document.removeEventListener('visibilitychange', handleVisibility)
		}
	}, [today])

	return useHydrated() ? today : null
}
