'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { isDay } from '../../schemas/recipe'
import { today } from '../../utilities/day'
import { isMonth, toMonth, weekStart } from '../../utilities/rota-week'

/** Where the reader is in Rota, as the address bar carries it. */
export type RotaLocation = {
	/** The Monday of the week the board draws. */
	week: string
	/** The `YYYY-MM` month the calendar draws. */
	month: string
	/** The day whose panel is open, or `null`. */
	day: string | null
}

/** What {@link useRotaLocation} hands back: where the reader is, and the ways to move them. */
export type RotaLocationHandle = RotaLocation & {
	setWeek: (week: string) => void
	setMonth: (month: string) => void
	setDay: (day: string | null) => void
}

/**
 * The reader's place in Rota, held in the address bar rather than in state.
 *
 * Every field here is somewhere they went, so each write earns a history entry
 * and the Back button undoes it. That is the part that separates these from the
 * list's filters: a reader who steps three weeks forward means to be able to
 * step back, where one picking through labels does not mean to press Back four
 * times to leave the page.
 *
 * A week that is not a Monday is snapped to one, and anything that does not
 * parse falls back to the week or the month holding today. A reader can type
 * into the address bar, and a link can outlive the app that wrote it.
 */
export function useRotaLocation(): RotaLocationHandle {
	const params = useSearchParams()

	const router = useRouter()

	const pathname = usePathname()

	const stated = params.get('week')

	const week = useMemo(() => weekStart(isDay(stated) ? stated : today()), [stated])

	const statedMonth = params.get('month')

	const month = useMemo(
		() => (isMonth(statedMonth) ? statedMonth : toMonth(today())),
		[statedMonth],
	)

	const statedDay = params.get('day')

	const day = isDay(statedDay) ? statedDay : null

	const write = useCallback(
		(next: Partial<RotaLocation>) => {
			const query = new URLSearchParams(params.toString())

			for (const [key, value] of Object.entries(next)) {
				if (value === null || value === undefined) query.delete(key)
				else query.set(key, value)
			}

			const text = query.toString()

			router.push(text === '' ? pathname : `${pathname}?${text}`, { scroll: false })
		},
		[params, router, pathname],
	)

	const setWeek = useCallback((week: string) => write({ week }), [write])

	const setMonth = useCallback((month: string) => write({ month }), [write])

	const setDay = useCallback((day: string | null) => write({ day }), [write])

	return { week, month, day, setWeek, setMonth, setDay }
}
