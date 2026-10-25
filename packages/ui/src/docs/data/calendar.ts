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

/** The short name of each week of a period, from the first. */
export const weekNames = words('week', {
	w1: 'W1',
	w2: 'W2',
	w3: 'W3',
	w4: 'W4',
	w5: 'W5',
	w6: 'W6',
	w7: 'W7',
	w8: 'W8',
})
