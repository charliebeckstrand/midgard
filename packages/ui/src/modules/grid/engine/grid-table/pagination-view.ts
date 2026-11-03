import { functionalUpdate, type PaginationState } from '@tanstack/react-table'
import type { SetStateAction } from 'react'
import { clamp } from '../../../../utilities/clamp'
import type { GridPagination } from '../../types'
import {
	manualTotals,
	pageOffset,
	resolvePageCount,
	shownPageIndex,
} from '../grid-pagination-utilities'

/**
 * Resolved pagination view model the footer renders from: page coordinate,
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
	 * live index, held to the last page as the view shows it. Two navigations that
	 * land on one render compose under an updater; an absolute index computed from
	 * the rendered page resolves both to the same page. The result stays inside a
	 * known page count. The engine bounds it only against an explicit `pageCount`,
	 * which client mode never sets, so the view clamps it.
	 */
	setPageIndex: (index: SetStateAction<number>) => void
	setPageSize: (size: number) => void
}

/**
 * Builds the {@link GridPaginationView} the footer renders from.
 *
 * @remarks
 * The view counts the pages itself, as TanStack Table counts them (see
 * `resolvePageCount`). The actions write the page state of the grid with an
 * updater, so two navigations in one frame compose.
 *
 * @param args.rows - The count of the rows before pagination: the rows after
 *   the client filters.
 * @internal
 */
export function buildPaginationView(args: {
	write: (update: (prev: PaginationState) => PaginationState) => void
	pagination: PaginationState
	manual: boolean
	config: GridPagination
	rows: number
	pageRowCount: number
}): GridPaginationView {
	const { pageIndex, pageSize } = args.pagination

	const onPage = args.pageRowCount

	// A server grid supplies its totals. They reach the engine only in manual mode.
	const pageCount = resolvePageCount({
		...(args.manual ? manualTotals(args.config) : {}),
		rows: args.rows,
		pageSize,
	})

	const { write } = args

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
		// An updater steps from the shown page, not from a stored page past the last
		// one. `-1` (unknown) leaves the top open.
		setPageIndex: (index) =>
			write((prev) => {
				const next = functionalUpdate(index, shownPageIndex(prev.pageIndex, pageCount))

				const last = pageCount - 1

				return { ...prev, pageIndex: last >= 0 ? clamp(next, 0, last) : Math.max(0, next) }
			}),
		// The page that holds the first row of the page shown before.
		setPageSize: (size) =>
			write((prev) => ({
				pageIndex: Math.floor(pageOffset(prev.pageIndex, prev.pageSize) / Math.max(1, size)),
				pageSize: Math.max(1, size),
			})),
	}
}
