'use client'

import { useDateFormat } from 'ui/providers/locale'

/** The parts of a day, with Latin digits on the Gregorian calendar, so each part reads as a number. */
const DAY_PARTS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	calendar: 'gregory',
	numberingSystem: 'latn',
}

/** What {@link useToday} gives. */
export type Today = {
	/** Today, at local midnight, as a day field holds it. */
	today: Date
	/** The time zone that the day is read in. */
	zone: string
}

/**
 * Today, as the day field of a form shows it.
 *
 * The server and the reader can be on different days: at 7 PM in Denver, it is
 * already the next day in UTC. A field that read the clock of each side drew
 * one day on the server and another in the hydration render. React then threw
 * the markup of the server away and rendered the page again, and an open sheet
 * played its enter. `useDateFormat` reads the day in the time zone of the locale
 * provider on the server and in the hydration render, and in the zone of the
 * reader after. Thus the field shows the day of the server first, and the day
 * of the reader after hydration.
 *
 * A form reads its defaults when it mounts, so it keys on `zone` to take the
 * day of the reader.
 */
export function useToday(): Today {
	const format = useDateFormat(DAY_PARTS)

	const parts = format.formatToParts(new Date())

	const part = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((entry) => entry.type === type)?.value)

	return {
		today: new Date(part('year'), part('month') - 1, part('day')),
		zone: format.resolvedOptions().timeZone,
	}
}
