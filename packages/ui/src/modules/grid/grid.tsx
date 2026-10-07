'use client'

import { memo, useLayoutEffect } from 'react'
import { useContentHeightHost } from '../../primitives/content-height'
import { GridData } from './grid-data'
import type { GridDataProps } from './grid-data-types'
import type { GridPagination } from './types'

/**
 * Props for {@link Grid}: a flat `rows` source mapped through `columns`. Pass an
 * `editable` {@link GridEditableConfig} to bake in per-row inline editing.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridProps<T> = Omit<GridDataProps<T>, 'pagination'> & {
	/**
	 * Pagination binding. In server mode (the default once
	 * `rowCount`/`pageCount` is supplied) the consumer
	 * feeds each page as `rows`; in client mode the grid slices `rows` itself.
	 * Renders a footer with a row-range status, page navigation, and an optional
	 * page-size picker. The footer is one row. Its own width sets the layout:
	 * below 672px the numbered pages hide, and Previous/Next carry the
	 * navigation.
	 *
	 * Omit it to render every row with no footer. The exception is a grid with
	 * `maxHeight="fill"` in a box that can take the height of its content, such
	 * as a dashboard tile in the re-pack of a narrow board. That grid shows pages
	 * of 10 rows in the flow of the page, and the box grows to hold them, so the
	 * page has no scroll region inside a scroll region. Pass `false` to keep the
	 * rows in the scroll region of the box.
	 *
	 * The page navigation is a `<nav>` landmark. Its name comes from the name that
	 * `tableProps` gives the grid: an `aria-label` of `Orders` gives
	 * `Orders pagination`, and an `aria-labelledby` gives the same label followed
	 * by "pagination". A grid with no name gives the name `Pagination`. Give each
	 * grid on a page its own name, so that each nav also has its own name.
	 *
	 * @see {@link GridPagination}
	 */
	pagination?: GridPagination | false
}

/** The pages of a grid that takes the height of its content from its box. */
const FLOW_PAGINATION: GridPagination = { defaultValue: { pageIndex: 0, pageSize: 10 } }

/**
 * Data grid over a flat `rows` source. Maps each row through `columns`, keys rows
 * via `getKey`, and sorts its rows by column value itself. It shares that state
 * with head and cells through context. Sort, selection, and `columnOrder`
 * are controllable. Selecting rows surfaces a batch-action {@link Toolbar}, and
 * a column manager dialog reorders and hides columns. The `reorder` adds header
 * drag handles, and `navigable` adds a keyboard cell cursor (`role="grid"` with
 * an `aria-activedescendant` active cell). The `range` lets that cursor hold a
 * rectangular cell range, which copies as TSV and, in an editable grid, takes a
 * paste or a fill. The `size` sets the density step of the cell padding, and
 * `condensed` steps the whole grid down a notch. That covers padding, cell font,
 * header chrome, and the compact step of the table scope, which cell content
 * follows.
 *
 * Pass `editable` (a {@link GridEditableConfig}) to bake in inline editing. A
 * row in the editable set puts all of its editable cells into edit mode at once.
 * Each editor is inferred from the value's primitive type, or comes from a
 * column's {@link GridColumn.editCell} slot. Edits stage live; removing the row from the
 * set saves its changed cells as one batch through
 * {@link GridEditableConfig.onCommit} (Escape reverts a cell). A grid-owned
 * session ({@link GridEditableConfig.session}) can narrow to one cell instead
 * through {@link GridEditableConfig.scope}.
 *
 * Renders:
 *
 * - a loading skeleton (`aria-busy` with a polite status);
 * - an `empty` slot when there are no rows;
 * - a header row, which sticks to the top under `header={{ position: 'sticky' }}`;
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
function GridImpl<T>({ pagination, maxHeight, ...props }: GridProps<T>) {
	const host = useContentHeightHost()

	// A grid that fills a box which can grow shows pages in the flow instead.
	// A window of rows needs its scroll region, so a virtual or an infinite grid keeps it.
	const flow =
		pagination === undefined &&
		maxHeight === 'fill' &&
		host?.available === true &&
		!props.virtualize &&
		props.infiniteScroll === undefined

	useLayoutEffect(() => (flow ? host?.claim() : undefined), [flow, host])

	return (
		<GridData<T>
			{...props}
			pagination={flow ? FLOW_PAGINATION : pagination || undefined}
			maxHeight={flow ? undefined : maxHeight}
		/>
	)
}

/**
 * Data grid over {@link GridProps}: columns, sorting, filtering, grouping,
 * selection, and virtualization. Memoized on its shallow-equal props, so an
 * embedded grid rests while its host re-renders around it. See
 * {@link GridImpl} for the full binding remarks.
 */
export const Grid = memo(GridImpl) as typeof GridImpl
