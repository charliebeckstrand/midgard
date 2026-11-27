import { dayNames as day } from '../../../data/calendar.ts'
import { deliveryStops } from '../map/point/data.ts'

// The day of each late stop: seven of the twelve are on Tuesday.
const lateDays = [
	day.mon,
	day.tue,
	day.tue,
	day.wed,
	day.tue,
	day.thu,
	day.tue,
	day.fri,
	day.tue,
	day.fri,
	day.tue,
	day.tue,
]

const week = [day.mon, day.tue, day.wed, day.thu, day.fri]

/**
 * The twelve late stops of one week, which the chat demos cite. A row has a key
 * that does not change, so an agent can name the row. The day is the field that
 * a chart of the days filters.
 */
export const lateStops = deliveryStops
	.filter((stop) => stop.parcels !== undefined)
	.slice(0, 12)
	.map((stop, n) => ({ ...stop, key: `stop-${n + 1}`, day: lateDays[n] ?? day.tue }))

/**
 * The count of late stops on each day of the week. The counts come from
 * `lateStops`, so a chart of the days and a map of the stops agree.
 */
export const lateByDay = week.map((name) => ({
	day: name,
	late: lateStops.filter((stop) => stop.day === name).length,
}))
