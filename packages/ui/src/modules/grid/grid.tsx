'use client'

import { memo } from 'react'
import { GridData } from './grid-data'
import type { GridDataProps } from './grid-data-types'

/**
 * Props for {@link Grid}: a flat `rows` source mapped through `columns`. Pass an
 * `editable` {@link GridEditableConfig} to bake in per-row inline editing.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridProps<T> = GridDataProps<T>

/**
 * Data grid over a flat `rows` source. Maps each row through `columns`, keys rows
 * via `getKey`, and sorts by column value on the engine. It shares that state
 * with head and cells via {@link useGrid}. Sort, selection, and `columnOrder`
 * are controllable. Selecting rows surfaces a batch-action {@link Toolbar}, and
 * a column manager dialog reorders and hides columns. The `reorder` adds header
 * drag handles, and `navigable` adds a keyboard cell cursor (`role="grid"` with
 * an `aria-activedescendant` active cell). The `density` tunes cell padding, and
 * `condensed` steps the whole grid down a notch. That covers padding, cell font,
 * header chrome, and a compact cascade over client cell content.
 *
 * Pass `editable` (a {@link GridEditableConfig}) to bake in inline editing. A
 * row in the editable set puts all of its editable cells into edit mode at once.
 * Each editor is inferred from the value's primitive type, or comes from a
 * column's {@link GridColumn.editCell} slot. Edits stage live; removing the row from the
 * set saves its changed cells as one batch through
 * {@link GridEditableConfig.onCommit} (Escape reverts a cell). A grid-owned
 * session ({@link GridEditableConfig.trigger}) can narrow to one cell instead
 * through {@link GridEditableConfig.scope}.
 *
 * Renders:
 *
 * - a loading skeleton (`aria-busy` with a polite status);
 * - an `empty` slot when there are no rows;
 * - a sticky header;
 * - an optional `footer` summary bar: row total, selected count, custom content;
 * - under `virtualize`, windowed rows with full row/column counts.
 *
 * @remarks Client component. `virtualize` requires `maxHeight`; omitting it
 * throws, since virtualization needs a scroll container of known size.
 *
 * Memoized on its (shallow-equal) props. A parent that re-renders while holding
 * the grid's `columns`, `rows`, `getKey`, and config identities steady skips
 * re-rendering it. A chat transcript re-rendering on every streamed token around
 * a settled inline grid is the example. A prop whose identity churns each render
 * defeats the memo. Derive those once at the call site, and memoize the parsed
 * columns and rows. An embedded grid then rests when its data is unchanged.
 * @typeParam T - Shape of a single row.
 */
function GridImpl<T>(props: GridProps<T>) {
	return <GridData<T> {...props} />
}

/**
 * Data grid over {@link GridProps}: columns, sorting, filtering, grouping,
 * selection, and virtualization. Memoized on its shallow-equal props, so an
 * embedded grid rests while its host re-renders around it. See
 * {@link GridImpl} for the full binding remarks.
 */
export const Grid = memo(GridImpl) as typeof GridImpl
