import { functionalUpdate, type PaginationState } from '@tanstack/react-table'
import type { SetStateAction } from 'react'
import { clamp } from '../../../../utilities'
import type { GridPagination } from '../../types'
import { pageCountOf, pageOffset } from '../grid-pagination-utilities'
import type { EngineTable } from './features'

/**
 * Resolved pagination view model the footer renders from — page coordinate,
 * derived totals and bounds, and the navigation setters that drive the engine.
 *
 * @internal
 */
export type GridPaginationView = {
	pageIndex: number
	pageSize: number
	/** Total pages, or `-1` when unknown (server mode with no `rowCount`/`pageCount`). */
	pageCount: number
	/** Total rows across pages when known: `rowCount` in server mode, the filtered count in client mode. */
	rowCount: number | undefined
	/** 1-based index of the first row shown on the page; `0` when the page is empty. */
	from: number
	/** 1-based index of the last row shown on the page; `0` when the page is empty. */
	to: number
	canPrevious: boolean
	canNext: boolean
	pageSizeOptions: number[] | undefined
	/**
	 * Moves to a page, by absolute index or by an updater the engine applies to the
	 * live index. Two navigations that land on one render compose under an updater;
	 * an absolute index computed from the rendered page resolves both to the same
	 * page. The result stays inside a known page count. The engine bounds it only
	 * against an explicit `pageCount`, which client mode never sets, so the view
	 * clamps it.
	 */
	setPageIndex: (index: SetStateAction<number>) => void
	setPageSize: (size: number) => void
}

/**
 * Builds the {@link GridPaginationView} the footer renders from.
 *
 * @remarks
 * The view counts the pages itself, as the engine counts them (see
 * `pageCountOf`), so a render reads no engine row model. The engine handle
 * serves only the actions, which run after the render.
 *
 * @param args.rows - The count of the rows before pagination: the rows after
 *   the client filters.
 * @internal
 */
export function buildPaginationView<T>(args: {
	table: EngineTable<T>
	pagination: PaginationState
	manual: boolean
	config: GridPagination
	rows: number
	pageRowCount: number
}): GridPaginationView {
	const { pageIndex, pageSize } = args.pagination

	const onPage = args.pageRowCount

	// A server grid supplies its totals. They reach the engine only in manual mode.
	const pageCount = pageCountOf({
		pageCount: args.manual ? args.config.pageCount : undefined,
		rowCount: args.manual ? args.config.rowCount : undefined,
		rows: args.rows,
		pageSize,
	})

	const { table } = args

	return {
		pageIndex,
		pageSize,
		pageCount,
		// The count before pagination reflects the client filters; server mode trusts the supplied total.
		rowCount: args.manual ? args.config.rowCount : args.rows,
		from: onPage === 0 ? 0 : pageOffset(pageIndex, pageSize) + 1,
		to: onPage === 0 ? 0 : pageOffset(pageIndex, pageSize) + onPage,
		canPrevious: pageIndex > 0,
		canNext: pageCount === -1 || (pageCount !== 0 && pageIndex < pageCount - 1),
		pageSizeOptions: args.config.pageSizeOptions,
		// `-1` (unknown) leaves the top open. The engine still clamps the floor at 0.
		setPageIndex: (index) =>
			table.setPageIndex((current) => {
				const next = functionalUpdate(index, current)

				const last = pageCount - 1

				return last >= 0 ? clamp(next, 0, last) : next
			}),
		setPageSize: (size) => table.setPageSize(size),
	}
}
