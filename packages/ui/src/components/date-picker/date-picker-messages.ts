import { defineMessages } from '../../primitives/intl/intl-messages'

/**
 * The messages of the date picker: the placeholders of its trigger, the name
 * of its panel, its toolbar, its Today button, the button that opens its
 * calendar, and the custom range of the relative variant.
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
	selectDate: {
		id: 'ui.datePicker.selectDate',
		defaultMessage: 'Select a date',
		description: 'The text of an empty date picker that holds one date.',
	},
	selectDates: {
		id: 'ui.datePicker.selectDates',
		defaultMessage: 'Select dates',
		description: 'The text of an empty date picker that holds a start date and an end date.',
	},
	selectRange: {
		id: 'ui.datePicker.selectRange',
		defaultMessage: 'Select range',
		description:
			'The text of an empty date picker that holds a range, such as Last 7 days, and the name of its list of ranges.',
	},
	chooseDate: {
		id: 'ui.datePicker.chooseDate',
		defaultMessage: 'Choose date',
		description: 'The name of the panel of a date picker, which holds the calendar.',
	},
	customRange: {
		id: 'ui.datePicker.customRange',
		defaultMessage: 'Custom range',
		description:
			'The button that opens a start date field and an end date field in place of the list of ranges, and the name of that panel.',
	},
	backToPresets: {
		id: 'ui.datePicker.backToPresets',
		defaultMessage: 'Back to presets',
		description: 'The button that goes back from the custom range to the list of ranges.',
	},
	start: {
		id: 'ui.datePicker.start',
		defaultMessage: 'Start',
		description: 'The label of the field of the first date of a custom range.',
	},
	end: {
		id: 'ui.datePicker.end',
		defaultMessage: 'End',
		description: 'The label of the field of the last date of a custom range.',
	},
})
