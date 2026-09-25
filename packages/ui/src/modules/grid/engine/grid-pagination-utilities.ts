import type { GridPagination } from '../types'
/** A window entry: a 1-based page number, or `'gap'` for an elided range. @internal */
export type GridPageItem = number | 'gap'

/**
 * Computes the page numbers to show in the footer, collapsing long runs to a
 * `'gap'` marker so the control stays a fixed width. Always surfaces the first
 * and last page plus a window around the current one.
 *
 * @param current - The active page, 1-based.
 * @param total - Total page count.
 * @returns Page numbers interleaved with `'gap'` markers; empty when `total < 1`.
 *
 * @internal
 */
export function getVisiblePages(current: number, total: number): GridPageItem[] {
	if (total < 1) return []

	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

	if (current <= 3) return [1, 2, 3, 4, 'gap', total - 1, total]

	if (current >= total - 2) return [1, 2, 'gap', total - 3, total - 2, total - 1, total]

	return [1, 'gap', current - 1, current, current + 1, 'gap', total]
}

/** Server (manual) pagination is implied once a total is supplied. Exported for the grouping gates in `GridData`. @internal */
export function isManualPagination(config: GridPagination | undefined): boolean {
	return config?.manual ?? (config?.rowCount != null || config?.pageCount != null)
}

/**
 * The page count of a grid, as the engine counts it (`getPageCount`).
 *
 * @remarks
 * A supplied `pageCount` wins. Else the count divides the rows by the page
 * size, and rounds up. The rows are the supplied `rowCount`, else the rows
 * before pagination. An unbounded page size gives one page when there is a
 * row.
 *
 * @param args.pageCount - The page count that the consumer supplies, if any.
 * @param args.rowCount - The row count that the consumer supplies, if any.
 * @param args.rows - The count of the rows before pagination.
 * @param args.pageSize - The rows on each page.
 * @internal
 */
export function pageCountOf(args: {
	pageCount?: number | undefined
	rowCount?: number | undefined
	rows: number
	pageSize: number
}): number {
	if (args.pageCount != null) return args.pageCount

	const rows = args.rowCount ?? args.rows

	if (args.pageSize === Infinity && Number.isFinite(rows) && rows > 0) return 1

	return Math.ceil(rows / args.pageSize)
}

/**
 * The bounds of a page: the position of its first row, and the position
 * after its last row. The paginated row model of the engine slices the same
 * bounds. `null` keeps every row: the first page of an unbounded page size.
 *
 * @internal
 */
export function pageBounds(pageIndex: number, pageSize: number): [number, number] | null {
	if (pageSize === Infinity && pageIndex === 0) return null

	const start = pageSize * pageIndex

	return [start, start + pageSize]
}
