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
	columnNumber: { number: number }
	resizeColumn: { column: string }
	pixels: { width: number }
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
	pinColumn: { column: string }
	frozenColumn: { column: string; state: 'locked' | 'pinned' }
	showColumn: { column: string }
	reorderColumns: Record<never, never>
	columns: Record<never, never>
	filterColumns: Record<never, never>
	savePreset: Record<never, never>
	newGroup: Record<never, never>
	noColumnsInGroup: Record<never, never>
	noUngroupedColumns: Record<never, never>
	groupName: Record<never, never>
	groupNameFor: { group: string }
	removeGroupNamed: { group: string }
	moveTo: { group: string }
	removeFromGroup: Record<never, never>
	color: Record<never, never>
	colorFor: { group: string }
	colorOf: { color: string; group: string }
	noColor: Record<never, never>
	paletteColor: { color: string }
	apply: Record<never, never>
	autoSizeTitle: Record<never, never>
	autoSizeBody: Record<never, never>
	autoSizeConfirm: Record<never, never>
	resetTitle: Record<never, never>
	resetBody: Record<never, never>
	resetConfirm: Record<never, never>
	keepWidths: Record<never, never>
	sortBy: { column: string }
	sortByPriority: { column: string; priority: number }
	unpinColumn: { column: string }
	filterNamed: { column: string }
	filterActive: { column: string }
	editFilters: Record<never, never>
	clearFilters: Record<never, never>
	reorderRows: Record<never, never>
	actionsColumn: Record<never, never>
	detailsColumn: Record<never, never>
	selectAll: Record<never, never>
	selectAllOnPage: Record<never, never>
	dataGrid: Record<never, never>
	saveCell: { cell: string }
	discardCell: { cell: string }
	cellInRow: { column: string; row: number }
	cellInNewRow: { column: string }
	editCell: { cell: string }
	yes: Record<never, never>
	no: Record<never, never>
	commitRefused: Record<never, never>
	noRows: Record<never, never>
	rangeOf: { from: number; to: number; total: number }
	pageOf: { page: number; total: number }
	pageNumber: { page: number }
	paginationOf: { grid: string }
	paginationWord: Record<never, never>
	pagination: Record<never, never>
	rowsPerPage: Record<never, never>
	perPage: { count: number }
	previousPage: Record<never, never>
	nextPage: Record<never, never>
	rowsVisible: { rows: number; total: number }
	rowCount: { rows: number }
	selectedHidden: { selected: number; hidden: number }
	selectedOf: { selected: number; rows: number }
	rowsResult: { count: number }
	total: Record<never, never>
	exporting: Record<never, never>
	tableTools: Record<never, never>
	batchActions: Record<never, never>
	search: Record<never, never>
	newRow: Record<never, never>
	addRow: Record<never, never>
	expandNamed: { group: string }
	collapseNamed: { group: string }
	expandDetails: { row: string }
	collapseDetails: { row: string }
	loadFailed: Record<never, never>
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
	columnNumber: {
		id: 'ui.grid.columnNumber',
		defaultMessage: 'column {number, number}',
		description:
			'The name of a column with no label of its own, inside an announcement. The number is its place, from 1.',
	},
	resizeColumn: {
		id: 'ui.grid.resizeColumn',
		defaultMessage: 'Resize {column}',
		description: 'The name of the handle that resizes a column of the grid.',
	},
	pixels: {
		id: 'ui.grid.pixels',
		defaultMessage: '{width, plural, one {# pixel} other {# pixels}}',
		description: 'The width of a column of the grid, read by its resize handle.',
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
		defaultMessage: 'position {position, number} of {total, number}',
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
	pinColumn: {
		id: 'ui.grid.pinColumn',
		defaultMessage: 'Pin {column}',
		description:
			'The name of the button that opens the pin choices of a column in the column manager of a grid.',
	},
	frozenColumn: {
		id: 'ui.grid.frozenColumn',
		defaultMessage: '{column} ({state, select, locked {locked} other {pinned}})',
		description:
			'The name of the checkbox of a column that the reader cannot hide, because it is locked or pinned.',
	},
	showColumn: {
		id: 'ui.grid.showColumn',
		defaultMessage: 'Show {column}',
		description: 'The name of the checkbox that shows or hides a column of a grid.',
	},
	reorderColumns: {
		id: 'ui.grid.reorderColumns',
		defaultMessage: 'Reorder columns',
		description:
			'The name of the list of columns that the reader can reorder in the column manager of a grid.',
	},
	columns: {
		id: 'ui.grid.columns',
		defaultMessage: 'Columns',
		description: 'The name of the list of columns in the column manager of a grid.',
	},
	filterColumns: {
		id: 'ui.grid.filterColumns',
		defaultMessage: 'Filter columns',
		description:
			'The hint text and the name of the field that filters the columns in the column manager of a grid.',
	},
	savePreset: {
		id: 'ui.grid.savePreset',
		defaultMessage: 'Save as preset',
		description: 'The button that saves the layout of the columns of a grid as a preset.',
	},
	newGroup: {
		id: 'ui.grid.newGroup',
		defaultMessage: 'New group',
		description: 'The button that adds a column group, and the first name of the new group.',
	},
	noColumnsInGroup: {
		id: 'ui.grid.noColumnsInGroup',
		defaultMessage: 'No columns in this group',
		description: 'The text of a column group of a grid that holds no columns.',
	},
	noUngroupedColumns: {
		id: 'ui.grid.noUngroupedColumns',
		defaultMessage: 'No ungrouped columns',
		description: 'The text of the ungrouped columns of a grid when every column is in a group.',
	},
	groupName: {
		id: 'ui.grid.groupName',
		defaultMessage: 'Group name',
		description: 'The hint text of the field that names a column group of a grid.',
	},
	groupNameFor: {
		id: 'ui.grid.groupNameFor',
		defaultMessage: 'Group name for {group}',
		description:
			'The name of the field that names a column group of a grid. The group is its current name.',
	},
	removeGroupNamed: {
		id: 'ui.grid.removeGroupNamed',
		defaultMessage: 'Remove group {group}',
		description: 'The name of the button that removes a column group of a grid.',
	},
	moveTo: {
		id: 'ui.grid.moveTo',
		defaultMessage: 'Move to “{group}”',
		description: 'The menu item that moves a column into a column group of a grid.',
	},
	removeFromGroup: {
		id: 'ui.grid.removeFromGroup',
		defaultMessage: 'Remove from group',
		description: 'The menu item that takes a column out of its column group.',
	},
	color: {
		id: 'ui.grid.color',
		defaultMessage: 'Color',
		description: 'The button of a group with no color that opens the color choices.',
	},
	colorFor: {
		id: 'ui.grid.colorFor',
		defaultMessage: 'Color for {group}',
		description:
			'The name of the button of a group with no color that opens the color choices. The group is its name.',
	},
	colorOf: {
		id: 'ui.grid.colorOf',
		defaultMessage: '{color} color for {group}',
		description:
			'The name of the button of a group with a color that opens the color choices, such as "Red color for Contact".',
	},
	noColor: {
		id: 'ui.grid.noColor',
		defaultMessage: 'None',
		description: 'The color choice that removes the color of a group.',
	},
	paletteColor: {
		id: 'ui.grid.paletteColor',
		defaultMessage:
			'{color, select, zinc {Zinc} red {Red} amber {Amber} green {Green} blue {Blue} rose {Rose} violet {Violet} sky {Sky} other {{color}}}',
		description: 'The name of a color that a group of a grid can take.',
	},
	apply: {
		id: 'ui.grid.apply',
		defaultMessage: 'Apply',
		description: 'The button that applies the filter of a column of a grid.',
	},
	autoSizeTitle: {
		id: 'ui.grid.autoSizeTitle',
		defaultMessage: 'Auto-size all columns?',
		description:
			'The title of the dialog that asks before it fits every column of a grid to its content.',
	},
	autoSizeBody: {
		id: 'ui.grid.autoSizeBody',
		defaultMessage:
			'This fits every column to its content and replaces the column widths you saved. Your other layout preferences (order, visibility, and pinned columns) stay just as they are.',
		description:
			'The text of the dialog that asks before it fits every column of a grid to its content.',
	},
	autoSizeConfirm: {
		id: 'ui.grid.autoSizeConfirm',
		defaultMessage: 'Auto-size columns',
		description: 'The button that fits every column of a grid to its content.',
	},
	resetTitle: {
		id: 'ui.grid.resetTitle',
		defaultMessage: 'Reset column widths?',
		description:
			'The title of the dialog that asks before it discards the saved column widths of a grid.',
	},
	resetBody: {
		id: 'ui.grid.resetBody',
		defaultMessage:
			'This discards the column widths you saved, and the grid sizes the columns to fit its width again. Your other layout preferences (order, visibility, and pinned columns) stay just as they are.',
		description:
			'The text of the dialog that asks before it discards the saved column widths of a grid.',
	},
	resetConfirm: {
		id: 'ui.grid.resetConfirm',
		defaultMessage: 'Reset widths',
		description: 'The button that discards the saved column widths of a grid.',
	},
	keepWidths: {
		id: 'ui.grid.keepWidths',
		defaultMessage: 'Keep my widths',
		description: 'The button that closes the dialog and keeps the saved column widths of a grid.',
	},
	sortBy: {
		id: 'ui.grid.sortBy',
		defaultMessage: 'Sort by {column}',
		description: 'The name of the header button that sorts the rows of a grid by a column.',
	},
	sortByPriority: {
		id: 'ui.grid.sortByPriority',
		defaultMessage: 'Sort by {column}, sort priority {priority, number}',
		description:
			'The name of the header button of a column in a sort by many columns. The priority is its place in that sort, from 1.',
	},
	unpinColumn: {
		id: 'ui.grid.unpinColumn',
		defaultMessage: 'Unpin {column}',
		description: 'The name of the button in the header of a pinned column that unpins it.',
	},
	filterNamed: {
		id: 'ui.grid.filterNamed',
		defaultMessage: 'Filter {column}',
		description: 'The name of the header button that opens the filter of a grid column.',
	},
	filterActive: {
		id: 'ui.grid.filterActive',
		defaultMessage: 'Filter {column}, active',
		description: 'The name of the header button of a grid column whose filter is on.',
	},
	editFilters: {
		id: 'ui.grid.editFilters',
		defaultMessage: 'Edit filters',
		description: 'The menu item that opens the filter of a grid column to change it.',
	},
	clearFilters: {
		id: 'ui.grid.clearFilters',
		defaultMessage: 'Clear filters',
		description: 'The menu item and the button that remove the filters of a grid.',
	},
	reorderRows: {
		id: 'ui.grid.reorderRows',
		defaultMessage: 'Reorder rows',
		description: 'The hidden name of the header of the column of row drag handles.',
	},
	actionsColumn: {
		id: 'ui.grid.actionsColumn',
		defaultMessage: 'Actions',
		description:
			'The hidden name of the header of a column of row actions, such as edit and delete buttons, when the column has no title.',
	},
	detailsColumn: {
		id: 'ui.grid.detailsColumn',
		defaultMessage: 'Details',
		description:
			'The hidden name of the header of the column of the buttons that open the detail panel of each row, when the column has no title.',
	},
	selectAll: {
		id: 'ui.grid.selectAll',
		defaultMessage: 'Select all rows',
		description: 'The name of the checkbox in the header that selects every row of a grid.',
	},
	selectAllOnPage: {
		id: 'ui.grid.selectAllOnPage',
		defaultMessage: 'Select all rows on this page',
		description:
			'The name of the checkbox in the header that selects every row of the current page of a grid.',
	},
	dataGrid: {
		id: 'ui.grid.dataGrid',
		defaultMessage: 'Data grid',
		description: 'The name of a grid that the app gives no name.',
	},
	saveCell: {
		id: 'ui.grid.saveCell',
		defaultMessage: 'Save {cell}',
		description:
			'The name of the button that saves the edit of a cell. The cell names its column and row.',
	},
	discardCell: {
		id: 'ui.grid.discardCell',
		defaultMessage: 'Discard {cell}',
		description:
			'The name of the button that drops the edit of a cell. The cell names its column and row.',
	},
	cellInRow: {
		id: 'ui.grid.cellInRow',
		defaultMessage: '{column}, row {row, number}',
		description: 'The name of a cell of a grid by its column and its row number.',
	},
	cellInNewRow: {
		id: 'ui.grid.cellInNewRow',
		defaultMessage: '{column}, new row',
		description: 'The name of a cell of the new row of a grid by its column.',
	},
	editCell: {
		id: 'ui.grid.editCell',
		defaultMessage: 'Edit {cell}',
		description: 'The name of the editor of a cell of a grid. The cell names its column and row.',
	},
	yes: {
		id: 'ui.grid.yes',
		defaultMessage: 'Yes',
		description: 'The true choice of a yes-or-no cell of a grid.',
	},
	no: {
		id: 'ui.grid.no',
		defaultMessage: 'No',
		description: 'The false choice of a yes-or-no cell of a grid.',
	},
	commitRefused: {
		id: 'ui.grid.commitRefused',
		defaultMessage: 'Change not saved',
		description:
			'The error of a cell edit that the app did not save, when the app gives no reason.',
	},
	noRows: {
		id: 'ui.grid.noRows',
		defaultMessage: 'No rows',
		description: 'The page status of a grid that has no rows.',
	},
	rangeOf: {
		id: 'ui.grid.rangeOf',
		defaultMessage: '{from, number}–{to, number} of {total, number}',
		description:
			'The page status of a grid: the first and the last row of the page, and the count of rows.',
	},
	pageOf: {
		id: 'ui.grid.pageOf',
		defaultMessage: 'Page {page, number} of {total, number}',
		description: 'The page status of a grid that knows its number of pages.',
	},
	pageNumber: {
		id: 'ui.grid.pageNumber',
		defaultMessage: 'Page {page, number}',
		description: 'The page status of a grid that does not know its number of pages.',
	},
	paginationOf: {
		id: 'ui.grid.paginationOf',
		defaultMessage: '{grid} pagination',
		description: 'The name of the page navigation of a grid. The grid is its name.',
	},
	paginationWord: {
		id: 'ui.grid.paginationWord',
		defaultMessage: 'pagination',
		description: 'The hidden word after the name of a grid that names its page navigation.',
	},
	pagination: {
		id: 'ui.grid.pagination',
		defaultMessage: 'Pagination',
		description: 'The name of the page navigation of a grid with no name.',
	},
	rowsPerPage: {
		id: 'ui.grid.rowsPerPage',
		defaultMessage: 'Rows per page',
		description: 'The name of the control that picks the number of rows on a page of a grid.',
	},
	perPage: {
		id: 'ui.grid.perPage',
		defaultMessage: '{count, number} / page',
		description: 'The value of the rows-per-page control of a grid, such as "25 / page".',
	},
	previousPage: {
		id: 'ui.grid.previousPage',
		defaultMessage: 'Previous page',
		description: 'The name of the button that shows the page of a grid before this one.',
	},
	nextPage: {
		id: 'ui.grid.nextPage',
		defaultMessage: 'Next page',
		description: 'The name of the button that shows the page of a grid after this one.',
	},
	rowsVisible: {
		id: 'ui.grid.rowsVisible',
		defaultMessage: '{rows, number} of {total, plural, one {# row} other {# rows}} visible',
		description: 'The row count in the footer of a filtered grid.',
	},
	rowCount: {
		id: 'ui.grid.rowCount',
		defaultMessage: '{rows, plural, one {# row} other {# rows}}',
		description: 'The row count in the footer of a grid.',
	},
	selectedHidden: {
		id: 'ui.grid.selectedHidden',
		defaultMessage:
			'{selected, plural, one {# row selected} other {# rows selected}}, {hidden, number} not shown',
		description:
			'The selection count in the footer of a grid, when the filter hides some selected rows.',
	},
	selectedOf: {
		id: 'ui.grid.selectedOf',
		defaultMessage: '{selected, number} of {rows, plural, one {# row} other {# rows}} selected',
		description: 'The selection count in the footer of a grid.',
	},
	rowsResult: {
		id: 'ui.grid.rowsResult',
		defaultMessage: '{count, plural, =0 {No results} one {# row} other {# rows}}',
		description: 'Spoken when the rows of a grid finish loading. The count is the number of rows.',
	},
	total: {
		id: 'ui.grid.total',
		defaultMessage: 'Total',
		description: 'The label of the row that adds up the columns of a grid.',
	},
	exporting: {
		id: 'ui.grid.exporting',
		defaultMessage: 'Exporting',
		description: 'Shown while a grid exports its rows.',
	},
	tableTools: {
		id: 'ui.grid.tableTools',
		defaultMessage: 'Table tools',
		description: 'The name of the toolbar of the tools of a grid.',
	},
	batchActions: {
		id: 'ui.grid.batchActions',
		defaultMessage: 'Batch actions',
		description: 'The name of the toolbar of the actions on the selected rows of a grid.',
	},
	search: {
		id: 'ui.grid.search',
		defaultMessage: 'Search',
		description: 'The hint text and the name of the search field of a grid.',
	},
	newRow: {
		id: 'ui.grid.newRow',
		defaultMessage: 'New row',
		description: 'The name of the row where the reader types a new row of a grid.',
	},
	addRow: {
		id: 'ui.grid.addRow',
		defaultMessage: 'Add row',
		description: 'The name of the button that adds the new row to a grid.',
	},
	expandNamed: {
		id: 'ui.grid.expandNamed',
		defaultMessage: 'Expand {group}',
		description: 'The name of the button that shows the columns of a collapsed column group.',
	},
	collapseNamed: {
		id: 'ui.grid.collapseNamed',
		defaultMessage: 'Collapse {group}',
		description: 'The name of the button that hides the columns of a column group.',
	},
	expandDetails: {
		id: 'ui.grid.expandDetails',
		defaultMessage: 'Expand details for {row}',
		description: 'The name of the button that opens the detail panel of a row of a grid.',
	},
	collapseDetails: {
		id: 'ui.grid.collapseDetails',
		defaultMessage: 'Collapse details for {row}',
		description: 'The name of the button that closes the detail panel of a row of a grid.',
	},
	loadFailed: {
		id: 'ui.grid.loadFailed',
		defaultMessage: "Couldn't load data",
		description: 'The error of a grid whose rows did not load.',
	},
})
