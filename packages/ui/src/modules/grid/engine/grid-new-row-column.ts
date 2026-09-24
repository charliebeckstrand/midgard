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
 * The width (px) of the Add column. It holds the built-in icon button and the
 * cell padding, like the other affordance columns.
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
 * The columns that the engine receives, with the Add column after them when
 * `show` is set. The Add column is an `actions` column, so it is not a data
 * column: no sort, filter, resize, reorder, or column manager reaches it. It
 * is locked to the inline end, and it is the last column of that edge.
 *
 * @remarks The column joins the pipeline after the column-order and
 * visibility state, so no saved order, hidden set, or width names its id.
 * The pinning view hides its frozen chrome (see `buildColumnPinning`). Only
 * the cell of the new-row slot sticks.
 *
 * @internal
 */
export function withNewRowAddColumn<T>(columns: GridColumn<T>[], show: boolean): GridColumn<T>[] {
	if (!show) return columns

	const add: GridColumn<T> = {
		id: NEW_ROW_ADD_COLUMN_ID,
		actions: noActions,
		locked: 'right',
		hideable: false,
		width: NEW_ROW_ADD_COLUMN_SIZE,
	}

	return [...columns, add]
}
