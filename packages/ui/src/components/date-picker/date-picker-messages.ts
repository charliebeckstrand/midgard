import { defineMessages } from '@formatjs/intl'

/**
 * The messages of the date picker: its toolbar, its Today button, and the
 * button that opens its calendar.
 *
 * @internal
 */
export const datePickerMessages = defineMessages({
	actions: {
		id: 'ui.datePicker.actions',
		defaultMessage: 'Date picker actions',
		description: 'The name of the toolbar with the Clear and Today buttons below the calendar.',
	},
	today: {
		id: 'ui.datePicker.today',
		defaultMessage: 'Today',
		description: 'The label of the button that selects the date of today.',
	},
	openCalendar: {
		id: 'ui.datePicker.openCalendar',
		defaultMessage: 'Open calendar',
		description: 'The name of the button that opens the calendar of a date field.',
	},
	closeCalendar: {
		id: 'ui.datePicker.closeCalendar',
		defaultMessage: 'Close calendar',
		description: 'The name of the button that closes the calendar of a date field.',
	},
})
