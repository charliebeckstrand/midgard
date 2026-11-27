import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'

// The values of each message of the tile chrome, by key.
type DashboardValues = {
	expand: { label: string }
	duplicate: { item: string }
	remove: { item: string }
	clearSelection: { label: string }
	resize: { label: string }
	arrange: { label: string }
	moveLeft: Record<never, never>
	moveRight: Record<never, never>
	moveUp: Record<never, never>
	moveDown: Record<never, never>
	increaseWidth: Record<never, never>
	decreaseWidth: Record<never, never>
	increaseHeight: Record<never, never>
	decreaseHeight: Record<never, never>
	noStep: Record<never, never>
	columns: { count: number }
	rows: { count: number }
	failed: { label: string }
	retry: Record<never, never>
	missing: { widget: string }
}

/**
 * The messages of the chrome of a dashboard tile: the names of its controls,
 * the items of its menu, the spans that its resize handles speak, its error
 * state, and the line of a tile that no widget claims.
 *
 * @internal
 */
export const dashboardMessages: MessageSet<DashboardValues> = defineMessages<DashboardValues>({
	expand: {
		id: 'ui.dashboard.expand',
		defaultMessage: 'Expand {label}',
		description: 'The name of the button that opens a dashboard tile in a dialog.',
	},
	duplicate: {
		id: 'ui.dashboard.duplicate',
		defaultMessage: 'Duplicate {item}',
		description: 'The name of the button that makes a copy of a dashboard tile.',
	},
	remove: {
		id: 'ui.dashboard.remove',
		defaultMessage: 'Remove {item}',
		description: 'The name of the button that removes a dashboard tile.',
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
	arrange: {
		id: 'ui.dashboard.arrange',
		defaultMessage: 'Arrange {label}',
		description:
			'The name of the button that opens the menu that moves and resizes a dashboard tile in edit mode.',
	},
	moveLeft: {
		id: 'ui.dashboard.moveLeft',
		defaultMessage: 'Move left',
		description: 'The menu item that moves a dashboard tile to the left on the screen.',
	},
	moveRight: {
		id: 'ui.dashboard.moveRight',
		defaultMessage: 'Move right',
		description: 'The menu item that moves a dashboard tile to the right on the screen.',
	},
	moveUp: {
		id: 'ui.dashboard.moveUp',
		defaultMessage: 'Move up',
		description: 'The menu item that moves a dashboard tile up.',
	},
	moveDown: {
		id: 'ui.dashboard.moveDown',
		defaultMessage: 'Move down',
		description: 'The menu item that moves a dashboard tile down.',
	},
	increaseWidth: {
		id: 'ui.dashboard.increaseWidth',
		defaultMessage: 'Increase width',
		description: 'The menu item that makes a dashboard tile one column wider.',
	},
	decreaseWidth: {
		id: 'ui.dashboard.decreaseWidth',
		defaultMessage: 'Decrease width',
		description: 'The menu item that makes a dashboard tile one column narrower.',
	},
	increaseHeight: {
		id: 'ui.dashboard.increaseHeight',
		defaultMessage: 'Increase height',
		description: 'The menu item that makes a dashboard tile one row higher.',
	},
	decreaseHeight: {
		id: 'ui.dashboard.decreaseHeight',
		defaultMessage: 'Decrease height',
		description: 'The menu item that makes a dashboard tile one row lower.',
	},
	noStep: {
		id: 'ui.dashboard.noStep',
		defaultMessage: 'No change',
		description:
			'The disabled item of the menu of a dashboard tile when the tile can neither move nor resize.',
	},
	columns: {
		id: 'ui.dashboard.columns',
		defaultMessage: '{count, plural, one {# column} other {# columns}}',
		description: 'The width of a dashboard tile in columns, which its resize handle speaks.',
	},
	rows: {
		id: 'ui.dashboard.rows',
		defaultMessage: '{count, plural, one {# row} other {# rows}}',
		description: 'The height of a dashboard tile in rows, which its resize handle speaks.',
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
