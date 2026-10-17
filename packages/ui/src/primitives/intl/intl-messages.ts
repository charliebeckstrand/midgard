import { defineMessage, defineMessages, type TypedMessageDescriptor } from 'react-intl'

/**
 * The messages that many controls of ui share. A message that one unit owns
 * stays in that unit.
 *
 * @internal
 */
export const intlMessages = defineMessages({
	close: {
		id: 'ui.common.close',
		defaultMessage: 'Close',
		description: 'The name of a button that closes a dialog, a sheet, or a panel.',
	},
	clear: {
		id: 'ui.common.clear',
		defaultMessage: 'Clear',
		description: 'The name of a button that empties a field.',
	},
	clearSelection: {
		id: 'ui.common.clearSelection',
		defaultMessage: 'Clear selection',
		description: 'The name of a button that removes the selected value of a picker.',
	},
	cancel: {
		id: 'ui.common.cancel',
		defaultMessage: 'Cancel',
		description: 'The label of a button that stops an action and makes no change.',
	},
	confirm: {
		id: 'ui.common.confirm',
		defaultMessage: 'Confirm',
		description: 'The label of a button that does the action that a dialog asks about.',
	},
	noResults: {
		id: 'ui.common.noResults',
		defaultMessage: 'No results',
		description: 'The text of a list when a search finds no item.',
	},
	system: {
		id: 'ui.common.system',
		defaultMessage: 'System',
		description: 'A setting that follows the setting of the operating system or the browser.',
	},
})

/**
 * The summary of a picker that holds more than one selected item, such as
 * "3 selected". It takes the `count` of the items.
 *
 * @internal
 */
export const selectedMessage: TypedMessageDescriptor<{ count: number }> = defineMessage<{
	count: number
}>({
	id: 'ui.common.selected',
	defaultMessage: '{count, plural, other {# selected}}',
	description: 'The summary of a picker that holds more than one selected item.',
})
