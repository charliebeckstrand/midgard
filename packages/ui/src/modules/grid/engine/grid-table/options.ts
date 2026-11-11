import type {
	ColumnOrderState,
	ColumnPinningState,
	ColumnSizingState,
	ColumnVisibilityState,
	columnResizingState,
	OnChangeFn,
} from '@tanstack/react-table'
import { isDataColumn } from '../../../../utilities/is-data-column'
import type { GridColumn } from '../../types'
import {
	DRAG_HANDLE_COLUMN_SIZE,
	EXPANDER_COLUMN_SIZE,
	SELECT_COLUMN_SIZE,
} from '../grid-constants'
import { isNewRowAddColumn, NEW_ROW_ADD_COLUMN_SIZE } from '../grid-new-row-column'
import { columnMinWidth } from '../grid-sizing/measure'
import type { EngineColumn, EngineColumnDef, EngineOptions } from './features'
import { parsePxWidth } from './resize-view'

/**
 * The seed width of a non-data column whose content the design system fixes: a checkbox, a
 * grip, a chevron. The autosizer replaces it with the content width (see `isContentSized`)
 * in the pass that reveals the table. The seed holds where no pass runs: a grid without
 * layout, or one whose sizing the consumer controls.
 *
 * An `actions` column gets no seed. Its content is the consumer's: one text button, a
 * save/discard pair, a lone icon. Any number here would be a guess that is wrong for most of
 * them, and the autosizer measures it like the others. The Add column of the new-row slot
 * is the exception, because the grid supplies its icon button (see `withNewRowAddColumn`).
 *
 * @internal
 */
function affordanceColumnSize<T>(column: GridColumn<T>): number | undefined {
	if (column.selectable) return SELECT_COLUMN_SIZE

	if (column.dragHandle) return DRAG_HANDLE_COLUMN_SIZE

	if (column.expander) return EXPANDER_COLUMN_SIZE

	if (isNewRowAddColumn(column.id)) return NEW_ROW_ADD_COLUMN_SIZE

	return undefined
}

/**
 * The engine `minSize` of a column: its `minWidth`, else, for a data column,
 * `DEFAULT_MIN_COLUMN_SIZE` or a declared width below it (see
 * {@link columnMinWidth}). A pointer drag, the keyboard, the separator's
 * `aria-valuemin`, and the measured floor then share one floor. A non-data
 * column does not resize, so it keeps the engine default.
 *
 * @internal
 */
function resolveMinSize<T>(column: GridColumn<T>): { minSize?: number } {
	if (column.minWidth == null && !isDataColumn(column)) return {}

	return { minSize: columnMinWidth(column) }
}

/**
 * Maps a grid column to its engine `ColumnDef`: identity, whether it resizes,
 * and its sizing bounds.
 *
 * @internal
 */
export function toColumnDef<T>(column: GridColumn<T>): EngineColumnDef<T> {
	// A width-less column takes the engine's 150px default; the selection,
	// drag-handle, and expander columns instead take a seed width near their
	// content, until the autosizer measures it. (The non-resizable auto layout
	// sizes them to content via `w-px`.)
	const size = parsePxWidth(column.width) ?? affordanceColumnSize(column)

	return {
		id: String(column.id),
		// Only data columns resize; non-data columns (selection, actions, drag handle, expander) hold their width.
		enableResizing: isDataColumn(column),
		...(size != null ? { size } : {}),
		...resolveMinSize(column),
		...(column.maxWidth != null ? { maxSize: column.maxWidth } : {}),
	}
}

/**
 * The engine's `ColumnDef[]` for the grid's columns. `meta` carries the source
 * column, so the engine's visible columns map back to it.
 *
 * @internal
 */
export function toColumnDefs<T>(columns: GridColumn<T>[]): EngineColumnDef<T>[] {
	return columns.map((column) => ({ ...toColumnDef(column), meta: { gridColumn: column } }))
}

/**
 * Maps the engine's visible leaf columns back to their source
 * {@link GridColumn}s, in order, through `meta`.
 *
 * @internal
 */
export function toGridColumns<T>(leaves: readonly EngineColumn<T>[]): GridColumn<T>[] {
	// An engine of `T` rows holds only the `GridColumn<T>` that `toColumnDefs` gave it.
	return leaves.flatMap(
		(leaf) => (leaf.columnDef.meta?.gridColumn as GridColumn<T> | undefined) ?? [],
	)
}

/** Column-resize slice of the table options, or `{}` when resizing is off. @internal */
export function resizeOptions<T>(args: {
	resizable: boolean
	onColumnSizingChange: OnChangeFn<ColumnSizingState>
	onColumnSizingInfoChange: OnChangeFn<columnResizingState>
}): Partial<EngineOptions<T>> {
	if (!args.resizable) return {}

	return {
		enableColumnResizing: true,
		columnResizeMode: 'onChange',
		onColumnSizingChange: args.onColumnSizingChange,
		onColumnResizingChange: args.onColumnSizingInfoChange,
	}
}

/**
 * Raises each width that a column-sizing update changes to its measured floor,
 * so a drag-resize can't pull a column below the width its header needs. A
 * single-word header stays whole (it never truncates), and a multi-word one
 * keeps its affordance icons. The engine's resize handler writes the dragged
 * width clamped only at zero (the `minSize` floor is applied later, at read
 * time). Every write (drag, keyboard, autosizer) funnels through here. This
 * is therefore the one place a sub-floor width is caught before it reaches the
 * controlled state.
 *
 * `floors` carries only the columns the autosizer has measured. A column without
 * an entry (none recorded yet, or width-controlled) is left to the engine's own
 * `minSize`. A width that is the same as in `prev` stays as it is: a seeded
 * `width` under the floor keeps its width while another column changes, and
 * the autosizer measures the floors again at that change. Returns the input
 * object unchanged when nothing sits below its floor. The autosizer's no-op
 * ticks therefore don't churn a fresh object through the controlled state, and
 * re-render the grid for nothing.
 *
 * @internal
 */
export function clampSizingToFloors(
	sizing: ColumnSizingState,
	floors: ReadonlyMap<string, number>,
	prev?: ColumnSizingState,
): ColumnSizingState {
	let result = sizing

	for (const id in sizing) {
		const floor = floors.get(id)

		const width = sizing[id]

		if (width === prev?.[id]) continue

		if (floor != null && width != null && width < floor) {
			if (result === sizing) result = { ...sizing }

			result[id] = floor
		}
	}

	return result
}

/**
 * The controlled state slices passed to the engine: the sizing slices are
 * optional, but the grid always owns column order, visibility, and pinning.
 * The pinning slice is empty when no column is pinned. If the slice is absent,
 * the engine keeps the last pinning that it got, and an unpinned column stays
 * at its pinned edge.
 *
 * @internal
 */
type GridControlledState = {
	columnSizing?: ColumnSizingState
	columnResizing?: columnResizingState
	columnPinning: ColumnPinningState
	columnOrder: ColumnOrderState
	columnVisibility: ColumnVisibilityState
}

/** The controlled state slices the active features own. @internal */
export function buildState(args: {
	resizable: boolean
	sizing: ColumnSizingState
	sizingInfo: columnResizingState
	columnPinning: ColumnPinningState
	columnOrder: ColumnOrderState
	columnVisibility: ColumnVisibilityState
}): GridControlledState {
	const state: GridControlledState = {
		columnPinning: args.columnPinning,
		columnOrder: args.columnOrder,
		columnVisibility: args.columnVisibility,
	}

	if (args.resizable) {
		state.columnSizing = args.sizing

		state.columnResizing = args.sizingInfo
	}

	return state
}
