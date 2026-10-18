import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'

// The values of each message of the date input, by key.
type DateInputValues = {
	name: Record<never, never>
	clear: Record<never, never>
	invalid: { format: string }
	between: { min: string; max: string }
	onOrAfter: { min: string }
	onOrBefore: { max: string }
}

/**
 * The messages of the date input: its default name, the name of its clear
 * button, and the messages of a typed entry that is not a valid date.
 *
 * @internal
 */
export const dateInputMessages: MessageSet<DateInputValues> = defineMessages<DateInputValues>({
	name: {
		id: 'ui.dateInput.name',
		defaultMessage: 'Date',
		description: 'The name of a date field that has no label.',
	},
	clear: {
		id: 'ui.dateInput.clear',
		defaultMessage: 'Clear date',
		description: 'The name of the button that clears a date field.',
	},
	invalid: {
		id: 'ui.dateInput.invalid',
		defaultMessage: 'Enter a valid date ({format})',
		description:
			'The error of a date field whose text is not a date. The format is the pattern of the field, such as DD/MM/YYYY.',
	},
	between: {
		id: 'ui.dateInput.between',
		defaultMessage: 'Enter a date between {min} and {max}',
		description:
			'The error of a date field whose date is before the first date or after the last date that it accepts.',
	},
	onOrAfter: {
		id: 'ui.dateInput.onOrAfter',
		defaultMessage: 'Enter a date on or after {min}',
		description: 'The error of a date field whose date is before the first date that it accepts.',
	},
	onOrBefore: {
		id: 'ui.dateInput.onOrBefore',
		defaultMessage: 'Enter a date on or before {max}',
		description: 'The error of a date field whose date is after the last date that it accepts.',
	},
})
