/**
 * The focus rules of an edit session: where focus goes as the grid ends a
 * session, and how the grid marks its own focus moves for the commit on leave.
 */

import {
	type EditableColumn,
	type GridActiveEdit,
	isColumnEditable,
	isInGrid,
} from './grid-editing-utilities'

/** The tabbable content of a cell. @internal */
const TABBABLE =
	'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * Reseats focus on the grid's single tab stop, `grid`, when focus sits in this
 * grid. Called before a grid-owned session exit unmounts the focused editor, so
 * the keyboard lands back on the cursor rather than falling to `<body>`.
 *
 * @remarks Focus in another grid stays where it is. That includes a grid nested
 * in a detail row of this one, because none of its elements unmount with the
 * exit. {@link isInGrid} tells the two apart.
 *
 * @internal
 */
function restoreGridFocus(grid: HTMLElement | null): void {
	if (grid && isInGrid(document.activeElement, grid)) grid.focus()
}

/**
 * Runs {@link restoreGridFocus} with `flag` set, and clears the flag after it,
 * also when the move throws. The commit on leave reads the flag, so it does not
 * read the grid's own move as a user who left the editor. A module function,
 * because the React Compiler does not compile a `try` without a `catch`.
 *
 * @internal
 */
export function reseatFlagged(flag: { current: boolean }, grid: HTMLElement | null): void {
	flag.current = true

	try {
		restoreGridFocus(grid)
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
 * The element that focus returns to for an element origin, or `null` when it
 * is gone. A cell gives its first tabbable element, such as its pencil, or the
 * tab stop `table` when it has none. @internal
 */
export function returnElement(element: Element, table: HTMLElement | null): HTMLElement | null {
	if (!element.isConnected || !(element instanceof HTMLElement)) return null

	if (element.tagName !== 'TD') return element

	return element.querySelector<HTMLElement>(TABBABLE) ?? table
}
