import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'
import type { StatusDotProps } from './status-dot'

// The values of each status message, by status.
type StatusValues = Record<NonNullable<StatusDotProps['status']>, Record<never, never>>

/**
 * The name of each status, for a screen reader. The color of a status dot
 * alone does not tell the status, so a component that shows a status dot
 * names it with one of these messages.
 *
 * @internal
 */
export const statusMessages: MessageSet<StatusValues> = defineMessages<StatusValues>({
	inactive: {
		id: 'ui.status.inactive',
		defaultMessage: 'Inactive',
		description: 'The status of a person or an item, which a screen reader speaks.',
	},
	active: {
		id: 'ui.status.active',
		defaultMessage: 'Active',
		description: 'The status of a person or an item, which a screen reader speaks.',
	},
	info: {
		id: 'ui.status.info',
		defaultMessage: 'Info',
		description: 'The status of a person or an item that has news, which a screen reader speaks.',
	},
	warning: {
		id: 'ui.status.warning',
		defaultMessage: 'Warning',
		description:
			'The status of a person or an item that needs attention, which a screen reader speaks.',
	},
	error: {
		id: 'ui.status.error',
		defaultMessage: 'Error',
		description:
			'The status of a person or an item that has a problem, which a screen reader speaks.',
	},
})
