import { FOCUSABLE_SELECTOR } from '../../../utilities'
import type { GridCellRef } from '../grid-editing-types'

/** The primitive-typed inline editor the grid mounts when a column supplies no `editCell` slot. @internal */
export type EditorKind = 'text' | 'number' | 'boolean'

/**
 * Picks the inline editor for a cell from its value's primitive type. A boolean
 * drives a yes/no listbox, a number a number input, and everything else (string,
 * null, undefined) a text input. A column's {@link GridColumn.editCell} slot
 * supersedes this for richer controls. @internal
 */
export function inferEditorKind(value: unknown): EditorKind {
	if (typeof value === 'boolean') return 'boolean'

	if (typeof value === 'number') return 'number'

	return 'text'
}

/**
 * Whether a data column can be edited: it isn't `readOnly` and binds an editor —
 * a `field` to read/write, or a custom `editCell` slot. A cell in an editable row
 * renders its editor only when this holds. @internal
 */
export function isColumnEditable(col: {
	readOnly?: boolean
	field?: unknown
	editCell?: unknown
}): boolean {
	return !col.readOnly && (col.field != null || col.editCell != null)
}

/**
 * The next editable column along a row from display index `from`, one `step`
 * to the right (`1`) or the left (`-1`). The walk wraps at the edges, and skips
 * each column {@link isColumnEditable} refuses. It returns `from` itself when
 * no other column is editable, and `-1` when none is. @internal
 */
export function stepEditableColumn(
	columns: readonly { readOnly?: boolean; field?: unknown; editCell?: unknown }[],
	from: number,
	step: 1 | -1,
): number {
	const count = columns.length

	for (let offset = 1; offset <= count; offset++) {
		const index = (((from + step * offset) % count) + count) % count

		const column = columns[index]

		if (column && isColumnEditable(column)) return index
	}

	return -1
}

/** The facts of one key press that a type-to-edit decision reads. @internal */
export type GridKeyPress = {
	key: string
	ctrlKey: boolean
	metaKey: boolean
	altKey: boolean
	/** Whether an input method composes the press, including the key that starts it. */
	composing: boolean
	/** Whether AltGr made the character. Some platforms also report Ctrl and Alt for it. */
	altGraph: boolean
}

/**
 * Reads a {@link GridKeyPress} off a keyboard event. The key that starts an
 * input-method composition reports `keyCode` 229 before `isComposing` turns
 * true, so both count as composing. The shape is structural, so the engine
 * reads a React event without a runtime import of React. @internal
 */
export function readKeyPress(event: {
	key: string
	ctrlKey: boolean
	metaKey: boolean
	altKey: boolean
	keyCode: number
	nativeEvent: { isComposing: boolean }
	getModifierState: (key: 'AltGraph') => boolean
}): GridKeyPress {
	return {
		key: event.key,
		ctrlKey: event.ctrlKey,
		metaKey: event.metaKey,
		altKey: event.altKey,
		composing: event.nativeEvent.isComposing || event.keyCode === 229,
		altGraph: event.getModifierState('AltGraph'),
	}
}

/**
 * The value a printable key seeds into an editor that it opens, or `null` when
 * the key must not open one. The seed replaces the cell's value, as in a
 * spreadsheet. A text editor takes the character. A number editor takes a
 * digit only, because it cannot hold a lone sign or point. A yes/no editor
 * takes no seed.
 *
 * @remarks Four kinds of press seed nothing. A press that an input method
 * composes must reach the method, not the grid. A shortcut with Ctrl, Cmd, or
 * Alt is not typing, but AltGr is. A named key (`Tab`, `F2`, `Dead`) has a name
 * longer than one character. Space stays with the cursor, which selects or
 * activates with it. @internal
 */
export function seedFromKey(press: GridKeyPress, kind: EditorKind): string | number | null {
	if (press.composing || press.metaKey) return null

	if ((press.ctrlKey || press.altKey) && !press.altGraph) return null

	if ([...press.key].length !== 1 || press.key === ' ') return null

	if (kind === 'text') return press.key

	if (kind === 'number' && /^\d$/.test(press.key)) return Number(press.key)

	return null
}

/**
 * The one cell a cell-scoped edit session sits on: the public
 * {@link GridCellRef}, under the name the engine reads. @internal
 */
export type GridActiveEdit = GridCellRef

/** Focusable editor content inside an editing cell, in preference order. @internal */
export const EDITOR_FOCUSABLE = 'input, select, textarea, button, [tabindex]'

/**
 * The elements of `root` in the tab order, in document order.
 *
 * @remarks {@link FOCUSABLE_SELECTOR} also matches a native control with
 * `tabindex="-1"` and a hidden input, so this filter drops both. The walk
 * matches each element in turn, because jsdom returns a selector list grouped
 * by branch, not in document order. @internal
 */
function tabbablesIn(root: Element): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
		(el) =>
			el.matches(FOCUSABLE_SELECTOR) &&
			el.tabIndex >= 0 &&
			!(el instanceof HTMLInputElement && el.type === 'hidden'),
	)
}

/**
 * Whether Tab from `target` stays inside its editing cell. That is so when
 * the cell has a tabbable element after the one that holds `target`, or one
 * before it for Shift+Tab. The browser then moves focus there. Only Tab from
 * the last element, or Shift+Tab from the first, leaves the cell. A single
 * control therefore always leaves it (WCAG 2.1.1). @internal
 */
export function tabStaysInCell(target: Element, backward: boolean): boolean {
	const cell = target.closest('td[data-grid-col]')

	if (!cell) return false

	const tabbables = tabbablesIn(cell)

	const at = tabbables.findIndex((el) => el.contains(target))

	if (at < 0) return false

	return backward ? at > 0 : at < tabbables.length - 1
}

/** Whether a coord names this cell; a null coord names none. @internal */
export function isSameCell(coord: GridActiveEdit | null, cell: GridActiveEdit): boolean {
	return coord !== null && coord.rowKey === cell.rowKey && coord.columnId === cell.columnId
}

/**
 * Whether a cell's editor is open. Its row is in the editable set and, when a
 * cell-scoped session holds that row, the session's cell is this one. A session
 * narrows the one row it sits on and no other. A row the consumer opens beside
 * it reads row-shaped, every editable cell at once, as does every row while no
 * session runs.
 *
 * @remarks This is the module's one definition of "editing here". Three
 * questions read it. Which cell mounts an editor. Which editor takes focus
 * after an entry. Which staged drafts a commit sweep must
 * flush — the cells this stops holding for. One predicate answering all three
 * keeps an editor's lifetime and its value's commit in step. @internal
 */
export function isCellEditing(args: {
	rowKey: string | number
	columnId: string | number
	editableRows: Set<string | number>
	activeEdit: GridActiveEdit | null
}): boolean {
	if (!args.editableRows.has(args.rowKey)) return false

	const active = args.activeEdit

	// A session narrows its own row. Any other row in the set belongs to the
	// consumer's binding, which names rows and never cells, so it stays whole.
	if (active === null || active.rowKey !== args.rowKey) return true

	return isSameCell(active, args)
}
