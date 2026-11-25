import { defineMessages } from '../../primitives/intl/intl-messages'

/**
 * The messages of a toolbar that fits its row with More: the names of the More
 * button and the Back button.
 *
 * @internal
 */
export const toolbarMessages = defineMessages({
	more: {
		id: 'ui.toolbar.more',
		defaultMessage: 'More',
		description:
			'The name of the button at the end of a toolbar row that shows the controls that the row cannot hold.',
	},
	back: {
		id: 'ui.toolbar.back',
		defaultMessage: 'Back',
		description:
			'The name of the button at the start of a toolbar row that shows the first controls of the toolbar again.',
	},
})
