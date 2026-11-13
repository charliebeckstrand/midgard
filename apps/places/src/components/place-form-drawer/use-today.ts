'use client'

import { useMemo } from 'react'
import { useHydrated } from 'ui/hooks'
import { fromDay, toDay } from '../../utilities/places-filter'

/**
 * Today, at local midnight, as a day field holds it, or `null` while the day
 * of the reader is not known.
 *
 * The server and the reader can be on different days: at 7 PM in Denver, it is
 * already the next day in UTC. The server does not know the time zone of the
 * reader, so a day from its clock can be the wrong day. The day is thus `null`
 * on the server and in the hydration render, and the field shows a skeleton
 * there. The render after hydration gives the day of the reader, and the field
 * shows it. A form that opens after hydration has the day from its first render.
 */
export function useToday(): Date | null {
	const day = useHydrated() ? toDay(new Date()) : null

	return useMemo(() => (day === null ? null : fromDay(day)), [day])
}
