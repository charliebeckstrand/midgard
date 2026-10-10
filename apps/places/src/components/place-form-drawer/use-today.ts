'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { fromDay, toDay } from '../../utilities/places-filter'

/** The day does not change in a way that a render must follow, so nothing subscribes. */
const subscribe = () => () => {}

/** The day of the reader, as the clock of the browser reads it. */
const readerDay = () => toDay(new Date())

/** The server cannot know the day of the reader. */
const unknownDay = () => null

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
	const day = useSyncExternalStore(subscribe, readerDay, unknownDay)

	return useMemo(() => (day === null ? null : fromDay(day)), [day])
}
