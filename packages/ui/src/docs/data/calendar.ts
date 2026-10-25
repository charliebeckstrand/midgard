import { words } from './words.ts'

// The names of the calendar in the demos (CONVENTIONS.md §13.8). A chart, a
// pivot table, or a heatmap reads a month or a day as a category, so a row
// holds the name, not a date.

/** The short name of each month. */
export const monthNames = words('month', {
	jan: 'Jan',
	feb: 'Feb',
	mar: 'Mar',
	apr: 'Apr',
	may: 'May',
	jun: 'Jun',
	jul: 'Jul',
	aug: 'Aug',
	sep: 'Sep',
	oct: 'Oct',
	nov: 'Nov',
	dec: 'Dec',
})

/** The short name of each day of the week, from Monday. */
export const dayNames = words('weekday', {
	mon: 'Mon',
	tue: 'Tue',
	wed: 'Wed',
	thu: 'Thu',
	fri: 'Fri',
	sat: 'Sat',
	sun: 'Sun',
})
