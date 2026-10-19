import { defineMessages } from '../../primitives/intl/intl-messages'

/**
 * The messages of a breadcrumb: the name of its navigation landmark.
 *
 * @internal
 */
export const breadcrumbMessages = defineMessages({
	label: {
		id: 'ui.breadcrumb.label',
		defaultMessage: 'Breadcrumb',
		description:
			'The name of the navigation landmark that holds the trail of links from the top page to the current page.',
	},
})
