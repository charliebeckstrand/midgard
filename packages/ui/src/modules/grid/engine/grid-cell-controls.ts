import { FOCUSABLE_SELECTOR } from '../../../utilities/focusable-selector'

/**
 * The attribute that marks a cell of the keyboard cursor: a header cell, a
 * body cell, a cell of the new-row slot, or the one cell of a one-stop row.
 * The controls in such a cell leave the tab order (see {@link pinControls}).
 *
 * @internal
 */
export const GRID_CELL_ATTR = 'data-grid-cell'

/** Selector for a cell of the keyboard cursor (see {@link GRID_CELL_ATTR}). @internal */
export const GRID_CELL = `[${GRID_CELL_ATTR}]`

/** The props that mark a cell of the keyboard cursor (see {@link GRID_CELL_ATTR}). @internal */
export const GRID_CELL_PROPS = { [GRID_CELL_ATTR]: '' }

/**
 * Selector for the sort control of a header cell, which `data-grid-sort`
 * marks. Enter on the header cell presses it. @internal
 */
export const SORT_CONTROL = '[data-grid-sort]'

/**
 * The `tabindex` attribute that each control had before the grid took it out
 * of the tab order, or `null` for none. A control that is in the map is out of
 * the tab order because of the grid.
 */
const pinned = new WeakMap<HTMLElement, string | null>()

/** Selector for the elements that can be a control: the tabbable ones, and the ones the grid took out of the tab order. */
const CANDIDATES = `${FOCUSABLE_SELECTOR},[tabindex="-1"]`

/**
 * The cell of `table`'s cursor that holds `element`, or `null`. A cell of a
 * grid nested in a detail panel of `table` belongs to that grid, so a control
 * in it has no cell of `table`.
 *
 * @internal
 */
export function ownerCell(element: Element, table: Element): HTMLElement | null {
	const cell = element.closest<HTMLElement>(GRID_CELL)

	return cell?.closest('table') === table ? cell : null
}

/** Whether an element can take focus from the keyboard, or could before the grid took it out of the tab order. */
function isControl(element: HTMLElement): boolean {
	if (!pinned.has(element) && element.tabIndex < 0) return false

	if (element instanceof HTMLInputElement && element.type === 'hidden') return false

	return !element.matches(':disabled')
}

/**
 * The controls of a cell of the cursor, in document order. The cell itself is
 * the first one when it takes focus, as the header of a column that drags
 * by its whole cell does. A control of a grid nested in the cell belongs to
 * that grid, so it is not one of them. The nested grid's own tab stop is one.
 */
function cellControls(cell: HTMLElement): HTMLElement[] {
	return [cell, ...cell.querySelectorAll<HTMLElement>(CANDIDATES)].filter(
		(element) => element.closest(GRID_CELL) === cell && isControl(element),
	)
}

/**
 * Moves focus to the first control of `cell` (see {@link cellControls}).
 * Returns whether the cell has a control.
 *
 * @internal
 */
export function focusFirstControl(cell: HTMLElement | null): boolean {
	const control = cell ? cellControls(cell)[0] : undefined

	control?.focus()

	return control !== undefined
}

/** Takes a control out of the tab order, and keeps its `tabindex` to give back. */
function pin(element: HTMLElement): void {
	if (element.tabIndex < 0) return

	pinned.set(element, element.getAttribute('tabindex'))

	element.setAttribute('tabindex', '-1')
}

/** Gives a control back its `tabindex`, when the grid took it out of the tab order. */
function unpin(element: HTMLElement): void {
	if (!pinned.has(element)) return

	const original = pinned.get(element) ?? null

	pinned.delete(element)

	if (original === null) element.removeAttribute('tabindex')
	else element.setAttribute('tabindex', original)
}

/**
 * Keeps the grid one tab stop. Each control in a cell of `table`'s cursor
 * leaves the tab order, except in `entered`: the cell, or the row of the
 * new-row slot, that holds focus. Tab then moves through the controls of
 * `entered` alone, and from its last control out of the grid. Shift+Tab from
 * its first control reaches the grid's own tab stop, which comes before every
 * cell. A control that is in no cell of the cursor, such as one in the empty
 * state, keeps its place in the tab order. A control of a nested grid is left
 * to that grid.
 *
 * Only the attributes that differ change, so a call that changes nothing
 * writes nothing.
 *
 * @internal
 */
export function pinControls(table: HTMLTableElement, entered: Element | null): void {
	for (const element of table.querySelectorAll<HTMLElement>(CANDIDATES)) {
		const cell = element.closest(GRID_CELL)

		if (cell && cell.closest('table') !== table) continue

		if (!cell || entered?.contains(cell)) unpin(element)
		else pin(element)
	}
}

/**
 * Gives each control in `table` that the grid took out of the tab order its
 * `tabindex` back. A control of a nested grid is left to that grid.
 *
 * @internal
 */
export function unpinControls(table: HTMLTableElement): void {
	for (const element of table.querySelectorAll<HTMLElement>('[tabindex="-1"]')) {
		const cell = element.closest(GRID_CELL)

		if (!cell || cell.closest('table') === table) unpin(element)
	}
}

/**
 * The part of `table` that focus on `target` opens to Tab: the cell of the
 * cursor that holds it, or the whole row of the new-row slot. The slot is one
 * row of fields, so Tab moves through its controls in order, as through a
 * form. It is `null` for a target in no cell of the cursor.
 *
 * @internal
 */
export function entryScope(target: Element, table: HTMLTableElement): Element | null {
	const cell = ownerCell(target, table)

	return cell?.closest('tr[data-slot="grid-new-row"]') ?? cell
}
