import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'

// The values of each message of the tile chrome, by key.
type DashboardValues = {
	expand: { label: string }
	clearSelection: { label: string }
	resize: { label: string }
	failed: { label: string }
	retry: Record<never, never>
	missing: { widget: string }
}

/**
 * The messages of the chrome of a dashboard tile: the names of its controls,
 * its error state, and the line of a tile that no widget claims.
 *
 * @internal
 */
export const dashboardMessages: MessageSet<DashboardValues> = defineMessages<DashboardValues>({
	expand: {
		id: 'ui.dashboard.expand',
		defaultMessage: 'Expand {label}',
		description: 'The name of the button that opens a dashboard tile in a dialog.',
	},
	clearSelection: {
		id: 'ui.dashboard.clearSelection',
		defaultMessage: 'Clear the selection in {label}',
		description: 'The name of the button that clears the selection that a dashboard tile holds.',
	},
	resize: {
		id: 'ui.dashboard.resize',
		defaultMessage: 'Resize {label}',
		description: 'The name of the handle that changes the size of a dashboard tile.',
	},
	failed: {
		id: 'ui.dashboard.failed',
		defaultMessage: '{label} failed to render.',
		description: 'The error text of a dashboard tile whose widget threw an error.',
	},
	retry: {
		id: 'ui.dashboard.retry',
		defaultMessage: 'Retry',
		description: 'The label of the button that renders a failed dashboard tile again.',
	},
	missing: {
		id: 'ui.dashboard.missing',
		defaultMessage: 'This dashboard cannot show a “{widget}” tile.',
		description:
			'The text of a dashboard tile whose kind no widget renders. The widget is the name of the kind.',
	},
})
