import { CATALOG_LOCALES } from 'ui/providers/locale'
import type { Place, Trip } from '../types'
import { DAY_FORMAT } from './places-filter'

/**
 * The text of each stored day of a visit and each span of days of a trip that
 * the page read, keyed by the day, or by {@link spanKey} for a span.
 */
export type DayTexts = Readonly<Record<string, string>>

/** The key of a span of days in {@link DayTexts}. */
export function spanKey(from: string, to: string): string {
	return `${from}/${to}`
}

/**
 * The text of each day of a visit and each span of a trip, in the locale of
 * the app, such as `Oct 4, 2026` and `Oct 4 – 9, 2026`. The page writes the
 * text on the server, so a reload paints the dates.
 *
 * The browser does not format these days again. The text of `Intl` comes from
 * the date data of the JavaScript engine, and two engines can write different
 * text for one format. A browser that formats a day again at hydration can
 * thus write text that differs from the HTML of the server, and React then
 * renders the tree again from the start. A day that the page did not read,
 * such as the day of a new visit, gets its text in the browser.
 */
export function dayTexts(places: readonly Place[], trips: readonly Trip[]): DayTexts {
	const format = new Intl.DateTimeFormat(CATALOG_LOCALES[0], DAY_FORMAT)

	const texts: Record<string, string> = {}

	for (const place of places) {
		for (const visit of place.visits) {
			texts[visit.visitedAt] = format.format(new Date(visit.visitedAt))
		}
	}

	for (const trip of trips) {
		texts[spanKey(trip.startsOn, trip.endsOn)] = format.formatRange(
			new Date(trip.startsOn),
			new Date(trip.endsOn),
		)
	}

	return texts
}
