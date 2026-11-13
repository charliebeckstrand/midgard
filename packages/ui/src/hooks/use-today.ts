'use client'

import { useEffect, useState } from 'react'
import { subscribeDocumentEvent } from '../utilities/document-listener'
import { useHydrated } from './use-hydrated'

/** The local midnight that starts the day of `date`. @internal */
function startOfDay(date: Date): Date {
	const start = new Date(date)

	start.setHours(0, 0, 0, 0)

	return start
}

/** The instant of the local midnight that ends the day of `date`, in milliseconds. @internal */
function endOfDay(date: Date): number {
	const next = new Date(date)

	next.setHours(24, 0, 0, 0)

	return next.getTime()
}

/**
 * The current day of the reader, as its local midnight, which moves to the
 * next day at local midnight.
 *
 * @returns The local midnight of the current day, or `null` until hydration.
 * @remarks
 * The value is `null` in the server render and in the hydration render. The
 * server does not know the time zone of the reader, and the day can change
 * between the server render and the hydration, so a day from the server can
 * be the wrong day. A client-only mount, such as a DatePicker popover, reads
 * the day in its first render and needs no second commit.
 *
 * A timer runs at the next local midnight. A browser holds the timers of a
 * hidden tab, so the hook also reads the clock when the page shows again. The
 * state changes only on a new day. The `Date` therefore keeps its identity for
 * the whole day, and a memoized header or grid does not render for it.
 *
 * @example
 * ```tsx
 * const today = useToday()
 *
 * return today === null ? <Skeleton /> : <DueDate from={today} />
 * ```
 */
export function useToday(): Date | null {
	const [today, setToday] = useState(() => startOfDay(new Date()))

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined

		// On a new day, the new state runs this effect again, and that run sets
		// the next timer. On the same day, the check sets a new timer. A timer
		// can fire before midnight, for example after a change to the system clock.
		const check = () => {
			const now = new Date()

			if (endOfDay(now) !== endOfDay(today)) {
				setToday(startOfDay(now))

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

		const unsubscribe = subscribeDocumentEvent('visibilitychange', handleVisibility)

		return () => {
			clearTimeout(timer)

			unsubscribe()
		}
	}, [today])

	return useHydrated() ? today : null
}
