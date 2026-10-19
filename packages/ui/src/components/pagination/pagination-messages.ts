import { defineMessages } from '../../primitives/intl/intl-messages'

/**
 * The messages of a pagination: the name of its navigation landmark, and the
 * names of the Previous and Next controls.
 *
 * @internal
 */
export const paginationMessages = defineMessages({
	label: {
		id: 'ui.pagination.label',
		defaultMessage: 'Pagination',
		description: 'The name of the navigation landmark that holds the page controls of a list.',
	},
	previous: {
		id: 'ui.pagination.previous',
		defaultMessage: 'Previous page',
		description: 'The name of the button that goes to the page before the current page.',
	},
	next: {
		id: 'ui.pagination.next',
		defaultMessage: 'Next page',
		description: 'The name of the button that goes to the page after the current page.',
	},
})
