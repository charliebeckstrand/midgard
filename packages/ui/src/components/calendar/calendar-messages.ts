import { defineMessages } from '../../primitives/intl/intl-messages'

/**
 * The messages of the calendar: the names of its step buttons and of its
 * month and year grids.
 *
 * @internal
 */
export const calendarMessages = defineMessages({
	previousMonth: {
		id: 'ui.calendar.previousMonth',
		defaultMessage: 'Previous month',
		description: 'The name of the button that shows the month before.',
	},
	nextMonth: {
		id: 'ui.calendar.nextMonth',
		defaultMessage: 'Next month',
		description: 'The name of the button that shows the month after.',
	},
	selectMonth: {
		id: 'ui.calendar.selectMonth',
		defaultMessage: 'Select month',
		description: 'The name of the grid of months in the month picker.',
	},
	previousYear: {
		id: 'ui.calendar.previousYear',
		defaultMessage: 'Previous year',
		description: 'The name of the button that shows the year before in the month picker.',
	},
	nextYear: {
		id: 'ui.calendar.nextYear',
		defaultMessage: 'Next year',
		description: 'The name of the button that shows the year after in the month picker.',
	},
	selectYear: {
		id: 'ui.calendar.selectYear',
		defaultMessage: 'Select year',
		description: 'The name of the grid of years in the year picker.',
	},
	previousDecade: {
		id: 'ui.calendar.previousDecade',
		defaultMessage: 'Previous decade',
		description: 'The name of the button that shows the ten years before in the year picker.',
	},
	nextDecade: {
		id: 'ui.calendar.nextDecade',
		defaultMessage: 'Next decade',
		description: 'The name of the button that shows the ten years after in the year picker.',
	},
})
