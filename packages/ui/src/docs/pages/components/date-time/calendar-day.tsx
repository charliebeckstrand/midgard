import { DateTime } from 'ui/date-time'

/** A calendar day is the same day in every zone, so the format sets its zone. */
export default function CalendarDay() {
	return <DateTime value="2026-10-04T00:00:00Z" format={{ dateStyle: 'long', timeZone: 'UTC' }} />
}
