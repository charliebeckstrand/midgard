'use client'

import { GridData } from './grid-data'
import type { GridDataProps } from './grid-data-types'
import { GridEditable, type GridEditableProps } from './grid-editable'

export type {
	GridColumnManagerConfig,
	GridColumnOrder,
	GridDataProps,
	GridSelection,
	GridSort,
	GridVirtualize,
} from './grid-data-types'

/**
 * Props for {@link Grid}: a read-only data grid ({@link GridDataProps}) or, when
 * `editable` is set, a spreadsheet-style editing surface
 * ({@link GridEditableProps}). The `editable` discriminant selects the arm.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridProps<T> = GridDataProps<T> | (GridEditableProps<T> & { editable: true })

/**
 * Data grid over a flat `rows` source. By default a read-only
 * {@link GridData}: it maps each row through `columns`, keys rows via `getKey`,
 * sorts by column value on the engine, and shares that state with head and
 * cells via {@link useGrid}. Sort, selection, and `columnOrder` are
 * controllable; selecting rows surfaces a batch-action {@link Toolbar}, a column
 * manager dialog reorders and hides columns, `reorder` adds header drag handles,
 * and `navigable` adds a keyboard cell cursor (`role="grid"` with an
 * `aria-activedescendant` active cell). Renders a loading skeleton (`aria-busy`
 * with a polite status), an `empty` slot when there are no rows, a sticky header,
 * and — under `virtualize` — windowed rows with full row/column counts (a
 * `role="grid"` only when `navigable`, otherwise a windowed `role="table"`).
 *
 * Pass `editable` for the spreadsheet-style {@link GridEditable} surface
 * instead; the `editable` discriminant on {@link GridProps} selects the arm.
 *
 * @remarks Client component. `virtualize` requires `maxHeight`; omitting it
 * throws, since virtualization needs a scroll container of known size.
 * @typeParam T - Shape of a single row.
 */
export function Grid<T>(props: GridProps<T>) {
	return props.editable ? <GridEditable<T> {...props} /> : <GridData<T> {...props} />
}
