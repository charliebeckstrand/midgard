import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'

// The values of each message, by key.
type Values = {
	previousMonth: Record<never, never>
	nextMonth: Record<never, never>
	selectMonth: { year: string }
	previousYear: Record<never, never>
	nextYear: Record<never, never>
	selectYear: { decade: string }
	previousDecade: Record<never, never>
	nextDecade: Record<never, never>
	selectMonthYear: Record<never, never>
}

/**
 * The messages of the calendar: the names of its step buttons and of its
 * month and year grids.
 *
 * @internal
 */
export const calendarMessages: MessageSet<Values> = defineMessages<Values>({
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
		defaultMessage: 'Select month, {year}',
		description:
			'The name of the grid of months in the month picker. {year} is the year of the grid, such as 2025.',
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
		defaultMessage: 'Select year, {decade}',
		description:
			'The name of the grid of years in the year picker. {decade} is the span of years that the grid shows, such as 2020–2029.',
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
	selectMonthYear: {
		id: 'ui.calendar.selectMonthYear',
		defaultMessage: 'Select month and year',
		description: 'The name of the panel that holds the month picker and the year picker.',
	},
})
