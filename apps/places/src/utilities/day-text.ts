import { type DateText, formatDateText } from 'ui/server'
import type { Place, Trip } from '../types'
import { DAY_FORMAT } from './places-filter'

/**
 * The text of each stored day of a visit and each span of days of a trip that
 * the page read, keyed by the day, or by {@link spanKey} for a span.
 */
export type DayTexts = Readonly<Record<string, DateText>>

/** The key of a span of days in {@link DayTexts}. */
export function spanKey(from: string, to: string): string {
	return `${from}/${to}`
}

/**
 * The text of each day of a visit and each span of a trip, in the locale of
 * the app, such as `Oct 4, 2026` and `Oct 4 – 9, 2026`. The page writes the
 * text on the server, so a reload paints the dates.
 *
 * The browser does not format these days again (see `formatDateText`). A day
 * that the page did not read, such as the day of a new visit, gets its text in
 * the browser.
 */
export function dayTexts(places: readonly Place[], trips: readonly Trip[]): DayTexts {
	const texts: Record<string, DateText> = {}

	const write = (key: string, value: Parameters<typeof formatDateText>[0]) => {
		const text = formatDateText(value, DAY_FORMAT)

		if (text !== null) texts[key] = text
	}

	for (const place of places) {
		for (const visit of place.visits) write(visit.visitedAt, visit.visitedAt)
	}

	for (const trip of trips) write(spanKey(trip.startsOn, trip.endsOn), [trip.startsOn, trip.endsOn])

	return texts
}
