/**
 * The messages of the grid. The reorders of the columns, the rows, and the
 * groups name their items with them, and the group editor speaks its drag with
 * them. The shared reorder sentences are in `primitives/intl/intl-reorder.ts`.
 */

import { defineMessages, type MessageSet } from '../../../primitives/intl/intl-define'

// The values of each grid message, by key.
type GridValues = {
	columnName: { column: string }
	columnGroupName: { group: string }
	rowGroupName: { group: string }
	rowName: { key: string }
	groupHandle: { group: string }
	selectRow: { row: string }
	groupPosition: { position: number; total: number }
	editor: Record<never, never>
	ungrouped: Record<never, never>
	isOver: { item: string; place: string }
	droppedIn: { item: string; place: string }
	droppedWhereStarted: { item: string }
	returnedWhereStarted: { item: string }
}

/**
 * The messages of the grid, by key.
 *
 * @internal
 */
export const gridMessages: MessageSet<GridValues> = defineMessages<GridValues>({
	columnName: {
		id: 'ui.grid.columnName',
		defaultMessage: '{column} column',
		description: 'The name of a column in a reorder announcement, such as "Price column".',
	},
	columnGroupName: {
		id: 'ui.grid.columnGroupName',
		defaultMessage: '{group} group',
		description:
			'The name of a column group in an announcement of the group editor, such as "Contact group".',
	},
	rowGroupName: {
		id: 'ui.grid.rowGroupName',
		defaultMessage: 'group {group}',
		description: 'The name of a row group in a reorder announcement, such as "group Active".',
	},
	rowName: {
		id: 'ui.grid.rowName',
		defaultMessage: 'row {key}',
		description: 'The name of a row with no label of its own. The key is the key of the row.',
	},
	groupHandle: {
		id: 'ui.grid.groupHandle',
		defaultMessage: 'Reorder group {group}',
		description: 'The name of the handle that drags a group to a new place in the list of groups.',
	},
	selectRow: {
		id: 'ui.grid.selectRow',
		defaultMessage: 'Select {row}',
		description: 'The name of the checkbox that selects a row.',
	},
	groupPosition: {
		id: 'ui.grid.groupPosition',
		defaultMessage: 'position {position} of {total}',
		description:
			'The place of a dragged group in the list of groups, inside an announcement of the group editor.',
	},
	editor: {
		id: 'ui.grid.editor',
		defaultMessage: 'the editor',
		description:
			'The group editor as a whole, as a place in an announcement, when a column is over no group.',
	},
	ungrouped: {
		id: 'ui.grid.ungrouped',
		defaultMessage: 'Ungrouped',
		description:
			'The heading of the columns that are in no group, and their place in an announcement.',
	},
	isOver: {
		id: 'ui.grid.isOver',
		defaultMessage: '{item} is over {place}.',
		description:
			'Spoken while a column or a group is dragged over a place in the group editor, such as "Name column is over Contact group.".',
	},
	droppedIn: {
		id: 'ui.grid.droppedIn',
		defaultMessage: 'Dropped {item} in {place}.',
		description: 'Spoken when a dragged column or group drops at a place in the group editor.',
	},
	droppedWhereStarted: {
		id: 'ui.grid.droppedWhereStarted',
		defaultMessage: 'Dropped {item} where it started.',
		description: 'Spoken when a dragged column or group drops over no place, so nothing moves.',
	},
	returnedWhereStarted: {
		id: 'ui.grid.returnedWhereStarted',
		defaultMessage: 'Returned {item} to where it started.',
		description: 'Spoken when a canceled drag in the group editor puts the item back.',
	},
})
