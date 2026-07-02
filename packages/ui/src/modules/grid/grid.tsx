'use client'

import { GridData } from './grid-data'
import type { GridDataProps } from './grid-data-types'

export type {
	GridColumnManagerConfig,
	GridColumnOrder,
	GridDataProps,
	GridFooter,
	GridFooterStats,
	GridHeader,
	GridSelection,
	GridSort,
	GridVirtualize,
} from './grid-data-types'
export type { GridColumnGroup, GridColumnGroups } from './grid-group-types'

/**
 * Props for {@link Grid}: a flat `rows` source mapped through `columns`. Pass an
 * `editable` {@link GridEditableConfig} to bake in per-row inline editing.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridProps<T> = GridDataProps<T>

/**
 * Data grid over a flat `rows` source. Maps each row through `columns`, keys rows
 * via `getKey`, sorts by column value on the engine, and shares that state with
 * head and cells via {@link useGrid}. Sort, selection, and `columnOrder` are
 * controllable; selecting rows surfaces a batch-action {@link Toolbar}, a column
 * manager dialog reorders and hides columns, `reorder` adds header drag handles,
 * and `navigable` adds a keyboard cell cursor (`role="grid"` with an
 * `aria-activedescendant` active cell).
 *
 * Pass `editable` (a {@link GridEditableConfig}) to bake in per-row inline
 * editing: a row in the editable set puts all of its editable cells into edit
 * mode at once — each editor inferred from the value's primitive type, or a
 * column's {@link GridColumn.editCell} slot. Edits stage live; removing the row
 * from the set saves its changed cells as one batch through
 * {@link GridEditableConfig.onValueChange} (Escape reverts a cell).
 *
 * Renders a loading skeleton (`aria-busy` with a polite status), an `empty` slot
 * when there are no rows, a sticky header, an optional `footer` summary bar (row
 * total, selected count, custom content), and — under `virtualize` — windowed
 * rows with full row/column counts.
 *
 * @remarks Client component. `virtualize` requires `maxHeight`; omitting it
 * throws, since virtualization needs a scroll container of known size.
 * @typeParam T - Shape of a single row.
 */
export function Grid<T>(props: GridProps<T>) {
	return <GridData<T> {...props} />
}
