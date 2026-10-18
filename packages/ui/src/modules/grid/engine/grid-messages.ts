/**
 * The messages of the grid. The reorders of the columns, the rows, and the
 * groups name their items with them, and the group editor speaks its drag with
 * them. The shared reorder sentences are in `primitives/intl/intl-reorder.ts`.
 */

import { defineMessages } from '../../../primitives/intl/intl-messages'
import type { MessageSet } from '../../../primitives/intl/types'

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
	sort: Record<never, never>
	sortAscending: Record<never, never>
	sortDescending: Record<never, never>
	clearSort: Record<never, never>
	pin: Record<never, never>
	pinLeft: Record<never, never>
	pinRight: Record<never, never>
	unpin: Record<never, never>
	autoSize: Record<never, never>
	autoSizeColumn: Record<never, never>
	autoSizeAll: Record<never, never>
	resetWidths: Record<never, never>
	manageColumns: Record<never, never>
	manageRows: Record<never, never>
	filterColumn: { column: string }
	groupBy: { column: string }
	ungroup: Record<never, never>
	export: Record<never, never>
	exportCsv: Record<never, never>
	exportExcel: Record<never, never>
	exportTo: { type: string }
	print: Record<never, never>
	copy: Record<never, never>
	fillDown: Record<never, never>
	fillRight: Record<never, never>
	fillLeft: Record<never, never>
	clearColor: Record<never, never>
	expandGroup: Record<never, never>
	collapseGroup: Record<never, never>
	expandAllGroups: Record<never, never>
	collapseAllGroups: Record<never, never>
	cellMenu: Record<never, never>
	columnMenu: { column: string }
	groupMenu: { group: string }
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
	sort: {
		id: 'ui.grid.sort',
		defaultMessage: 'Sort',
		description: 'The menu item of a grid column that opens the sort choices.',
	},
	sortAscending: {
		id: 'ui.grid.sortAscending',
		defaultMessage: 'Sort ascending',
		description: 'The menu item that sorts the rows of a grid by a column, from low to high.',
	},
	sortDescending: {
		id: 'ui.grid.sortDescending',
		defaultMessage: 'Sort descending',
		description: 'The menu item that sorts the rows of a grid by a column, from high to low.',
	},
	clearSort: {
		id: 'ui.grid.clearSort',
		defaultMessage: 'Clear sort',
		description: 'The menu item that removes the sort of a grid.',
	},
	pin: {
		id: 'ui.grid.pin',
		defaultMessage: 'Pin',
		description: 'The menu item of a grid column that opens the pin choices.',
	},
	pinLeft: {
		id: 'ui.grid.pinLeft',
		defaultMessage: 'Pin left',
		description: 'The menu item that pins a column of a grid to the left edge.',
	},
	pinRight: {
		id: 'ui.grid.pinRight',
		defaultMessage: 'Pin right',
		description: 'The menu item that pins a column of a grid to the right edge.',
	},
	unpin: {
		id: 'ui.grid.unpin',
		defaultMessage: 'Unpin',
		description: 'The menu item that unpins a column of a grid.',
	},
	autoSize: {
		id: 'ui.grid.autoSize',
		defaultMessage: 'Auto-size',
		description:
			'The menu item of a grid column that opens the choices that fit the widths of the columns.',
	},
	autoSizeColumn: {
		id: 'ui.grid.autoSizeColumn',
		defaultMessage: 'Auto-size this column',
		description: 'The menu item that fits the width of a grid column to its content.',
	},
	autoSizeAll: {
		id: 'ui.grid.autoSizeAll',
		defaultMessage: 'Auto-size all columns',
		description: 'The menu item that fits the width of each grid column to its content.',
	},
	resetWidths: {
		id: 'ui.grid.resetWidths',
		defaultMessage: 'Reset column widths',
		description:
			'The menu item that gives the widths of the grid columns back to the automatic fit.',
	},
	manageColumns: {
		id: 'ui.grid.manageColumns',
		defaultMessage: 'Manage columns',
		description:
			'The menu item that opens the dialog that shows, hides, and orders the columns of a grid.',
	},
	manageRows: {
		id: 'ui.grid.manageRows',
		defaultMessage: 'Manage rows',
		description:
			'The menu item that opens the dialog that orders and colors the row groups of a grid.',
	},
	filterColumn: {
		id: 'ui.grid.filterColumn',
		defaultMessage: 'Filter “{column}”',
		description: 'The menu item that opens the filter of a grid column. The column is its name.',
	},
	groupBy: {
		id: 'ui.grid.groupBy',
		defaultMessage: 'Group by “{column}”',
		description:
			'The menu item that groups the rows of a grid by a column. The column is its name.',
	},
	ungroup: {
		id: 'ui.grid.ungroup',
		defaultMessage: 'Ungroup',
		description: 'The menu item that stops the grouping of the rows of a grid.',
	},
	export: {
		id: 'ui.grid.export',
		defaultMessage: 'Export',
		description: 'The menu item and the button that open the export choices of a grid.',
	},
	exportCsv: {
		id: 'ui.grid.exportCsv',
		defaultMessage: 'Export to CSV',
		description: 'The action that downloads the rows of a grid as a CSV file.',
	},
	exportExcel: {
		id: 'ui.grid.exportExcel',
		defaultMessage: 'Export to Excel',
		description: 'The action that downloads the rows of a grid as an Excel workbook.',
	},
	exportTo: {
		id: 'ui.grid.exportTo',
		defaultMessage: 'Export to {type}',
		description: 'The action of an export type that the app adds to a grid. The type is its name.',
	},
	print: {
		id: 'ui.grid.print',
		defaultMessage: 'Print',
		description: 'The action that prints the rows of a grid.',
	},
	copy: {
		id: 'ui.grid.copy',
		defaultMessage: 'Copy',
		description: 'The menu item that copies the selected cells of a grid.',
	},
	fillDown: {
		id: 'ui.grid.fillDown',
		defaultMessage: 'Fill down',
		description:
			'The menu item that copies the first row of a cell range of a grid down the range.',
	},
	fillRight: {
		id: 'ui.grid.fillRight',
		defaultMessage: 'Fill right',
		description:
			'The menu item that copies the first column of a cell range of a grid to the right.',
	},
	fillLeft: {
		id: 'ui.grid.fillLeft',
		defaultMessage: 'Fill left',
		description:
			'The menu item that copies the first column of a cell range of a grid to the left.',
	},
	clearColor: {
		id: 'ui.grid.clearColor',
		defaultMessage: 'Clear color',
		description: 'The menu item that removes the color of a group of a grid.',
	},
	expandGroup: {
		id: 'ui.grid.expandGroup',
		defaultMessage: 'Expand group',
		description: 'The menu item that opens a row group of a grid.',
	},
	collapseGroup: {
		id: 'ui.grid.collapseGroup',
		defaultMessage: 'Collapse group',
		description: 'The menu item that closes a row group of a grid.',
	},
	expandAllGroups: {
		id: 'ui.grid.expandAllGroups',
		defaultMessage: 'Expand all groups',
		description: 'The menu item that opens every row group of a grid.',
	},
	collapseAllGroups: {
		id: 'ui.grid.collapseAllGroups',
		defaultMessage: 'Collapse all groups',
		description: 'The menu item that closes every row group of a grid.',
	},
	cellMenu: {
		id: 'ui.grid.cellMenu',
		defaultMessage: 'Cell menu',
		description: 'The name of the context menu of a grid cell.',
	},
	columnMenu: {
		id: 'ui.grid.columnMenu',
		defaultMessage: '{column} column menu',
		description: 'The name of the context menu of a grid column. The column is its name.',
	},
	groupMenu: {
		id: 'ui.grid.groupMenu',
		defaultMessage: '{group} group menu',
		description: 'The name of the context menu of a group of a grid. The group is its name.',
	},
})
