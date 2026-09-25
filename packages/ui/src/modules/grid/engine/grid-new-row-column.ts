import type { GridNewRowAdd } from '../grid-editing-types'
import type { GridColumn } from '../types'

/**
 * The id of the column that holds the Add control of the new-row slot. The
 * grid adds this column itself (see {@link withNewRowAddColumn}). The `__`
 * prefix keeps the id clear of the ids of the consumer's columns.
 *
 * @internal
 */
export const NEW_ROW_ADD_COLUMN_ID = '__grid-new-row-add'

/**
 * The width (px) of the Add column before its first measure, and in an
 * environment with no layout. It holds the built-in icon button and the cell
 * padding, like the other affordance columns.
 *
 * @internal
 */
export const NEW_ROW_ADD_COLUMN_SIZE = 48

/** The accessible name of the Add column's header. @internal */
export const NEW_ROW_ADD_COLUMN_LABEL = 'Add row'

/** Whether a column id names the Add column of the new-row slot. @internal */
export function isNewRowAddColumn(id: string | number): boolean {
	return id === NEW_ROW_ADD_COLUMN_ID
}

/** The row slot of the Add column, which is empty in every data row. @internal */
function noActions(): null {
	return null
}

/**
 * The columns that the engine receives, with the Add column after them at
 * `width` px. A `null` width adds no column. The Add column is an `actions`
 * column, so it is not a data column: no sort, filter, resize, reorder, or
 * column manager reaches it. It is locked to the inline end, and it is the
 * last column of that edge.
 *
 * @remarks The column joins the pipeline after the column-order and
 * visibility state, so no saved order, hidden set, or width names its id.
 * The pinning view hides its frozen chrome (see `buildColumnPinning`). Only
 * the cell of the new-row slot sticks.
 *
 * @internal
 */
export function withNewRowAddColumn<T>(
	columns: GridColumn<T>[],
	width: number | null,
): GridColumn<T>[] {
	if (width === null) return columns

	const add: GridColumn<T> = {
		id: NEW_ROW_ADD_COLUMN_ID,
		actions: noActions,
		locked: 'right',
		hideable: false,
		width,
	}

	return [...columns, add]
}

/**
 * The width (px) of the Add column, or `null` when the grid adds none: with no
 * new-row slot, or with `newRowAdd: false`. A fixed `width` wins. Else the
 * column takes the width that its cell last measured, or
 * {@link NEW_ROW_ADD_COLUMN_SIZE} before the first measure.
 *
 * @param shown - Whether the grid shows a new-row slot.
 * @param add - The consumer's `newRowAdd`.
 * @param measured - The width that the Add cell last measured, if any.
 * @internal
 */
export function resolveNewRowAddWidth(
	shown: boolean,
	add: false | GridNewRowAdd | undefined,
	measured: number | null,
): number | null {
	if (!shown || add === false) return null

	return add?.width ?? measured ?? NEW_ROW_ADD_COLUMN_SIZE
}

/**
 * The width (px) that the Add cell needs: the width of its control and the
 * horizontal padding and border of the cell, rounded up. It is `null` with no
 * layout (jsdom, `display: none`), where the control measures nothing.
 *
 * @param cell - The Add cell of the new-row slot.
 * @param control - The inline box around the control, which is as wide as the
 * control, whatever the width of the cell.
 * @internal
 */
export function measureNewRowAddCell(cell: HTMLElement, control: HTMLElement): number | null {
	const content = control.getBoundingClientRect().width

	if (content === 0) return null

	const style = getComputedStyle(cell)

	const chrome = [
		style.paddingInlineStart,
		style.paddingInlineEnd,
		style.borderInlineStartWidth,
		style.borderInlineEndWidth,
	].reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0)

	return Math.ceil(content + chrome)
}
