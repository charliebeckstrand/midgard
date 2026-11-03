/**
 * The focus rules of an edit session: where focus goes as the grid ends a
 * session, and how the grid marks its own focus moves for the commit on leave.
 */

import {
	type EditableColumn,
	type GridActiveEdit,
	inGrid,
	isColumnEditable,
} from './grid-editing-utilities'

/**
 * Reseats focus on the grid's single tab stop, `grid`, when focus sits in this
 * grid. Called before a grid-owned session exit unmounts the focused editor, so
 * the keyboard lands back on the cursor rather than falling to `<body>`.
 *
 * @remarks Focus in another grid stays where it is. That includes a grid nested
 * in a detail row of this one, because none of its elements unmount with the
 * exit. {@link inGrid} tells the two apart.
 *
 * @internal
 */
function restoreFocus(grid: HTMLElement | null): void {
	if (grid && inGrid(document.activeElement, grid)) grid.focus()
}

/**
 * Runs {@link restoreFocus} with `flag` set, and clears the flag after it,
 * also when the move throws. The commit on leave reads the flag, so it does not
 * read the grid's own move as a user who left the editor. A module function,
 * because the React Compiler does not compile a `try` without a `catch`.
 *
 * @internal
 */
export function reseatFlagged(flag: { current: boolean }, grid: HTMLElement | null): void {
	flag.current = true

	try {
		restoreFocus(grid)
	} finally {
		flag.current = false
	}
}

/**
 * Where focus returns as a session on a row ends: the cell that the session
 * entered, or the place of the last press or focus as the row opened. @internal
 */
export type FocusOrigin = { cell: GridActiveEdit } | { element: Element }

/**
 * The cell of the first editor of the row `rowKey`: the first editable column
 * of `columns`, in display order. `null` when no column is editable. @internal
 */
export function firstEditorCell(
	rowKey: string | number,
	columns: readonly (EditableColumn & { id: string | number })[],
): GridActiveEdit | null {
	const column = columns.find((candidate) => isColumnEditable(candidate))

	return column ? { rowKey, columnId: column.id } : null
}

/**
 * The column of the cell in use on `rowKey`: the cell that a cell-scoped
 * session holds, else the active cell of the cursor, or `undefined` when
 * neither is on the row. The form of a row opens on it. @internal
 */
export function columnInUse(
	rowKey: string | number,
	{
		held,
		cursor,
		rowKeys,
		columns,
	}: {
		/** The cell that a cell-scoped session holds, or `null` for none. */
		held: GridActiveEdit | null
		/** The active cell of the cursor, in data row indexes, or `null` for none. */
		cursor: { row: number; col: number } | null
		rowKeys: readonly (string | number)[]
		/** Visible data columns in display order. */
		columns: readonly { id: string | number }[]
	},
): string | number | undefined {
	if (held?.rowKey === rowKey) return held.columnId

	if (cursor === null || rowKeys[cursor.row] !== rowKey) return undefined

	return columns[cursor.col]?.id
}

/**
 * The place of a press or a focus on `target`, read for `table`. Content in a
 * cell, such as a pencil, gives that cell, because the content can be gone when
 * the row closes. The tab stop gives the table, and an element outside the grid
 * gives itself. @internal
 */
export function interactionPlace(table: HTMLElement, target: Element): Element {
	if (target === table || !table.contains(target)) return target

	const cell = target.closest('td')

	return cell !== null && cell.closest('table') === table ? cell : table
}

/**
 * Moves focus to `target` with `flag` set, as {@link reseatFlagged} does. The
 * page does not scroll. @internal
 */
export function returnFlagged(flag: { current: boolean }, target: HTMLElement): void {
	flag.current = true

	try {
		target.focus({ preventScroll: true })
	} finally {
		flag.current = false
	}
}

/**
 * The element that focus returns to for an element origin. It is the element
 * itself when it is outside the cells of the grid. A cell gives the tab stop
 * `table`, because focus on a control of a cell enters that cell, and the
 * cursor must stay free to move. The cursor goes onto the cell instead (see
 * `useGridEditFocus`). An element that is gone gives the tab stop too, so
 * focus does not fall to the page as the editor unmounts.
 *
 * @internal
 */
export function returnElement(element: Element, table: HTMLElement | null): HTMLElement | null {
	if (element.isConnected && element instanceof HTMLElement && element.tagName !== 'TD') {
		return element
	}

	return table
}
