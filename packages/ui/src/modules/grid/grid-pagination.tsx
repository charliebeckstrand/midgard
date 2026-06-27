'use client'

import {
	Pagination,
	PaginationGap,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../components/pagination'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { getVisiblePages } from './grid-pagination-utilities'
import type { GridPaginationView } from './use-grid-table'

/** Props for {@link GridPagination}. @internal */
type GridPaginationProps = {
	pagination: GridPaginationView
}

/**
 * The footer's row-range status: the 1-based slice shown on this page against
 * the known total (`1–10 of 47`), `No rows` for an empty set, or a bare page
 * marker (`Page 3 of 5`, or `Page 3` for an unbounded server feed whose total is
 * unknown).
 *
 * @internal
 */
function pageStatus({
	from,
	to,
	rowCount,
	pageNumber,
	pageCount,
}: {
	from: number
	to: number
	rowCount: number | undefined
	pageNumber: number
	pageCount: number
}): string {
	if (rowCount === 0) return 'No rows'

	if (rowCount != null) return `${from}–${to} of ${rowCount}`

	if (pageCount > 0) return `Page ${pageNumber} of ${pageCount}`

	return `Page ${pageNumber}`
}

/**
 * Footer for a paginated {@link Grid}, laid out as three zones: a row-range
 * status, the page navigation, and an optional page-size picker — all driven by
 * the {@link GridPaginationView} the grid's TanStack Table engine resolves. From
 * `lg` they share one row (status at the start, nav centered, controls at the
 * end); below it the nav stacks above a status/controls row. Numbered pages
 * render only when the total page count is known; an unbounded server feed falls
 * back to Previous/Next around a "Page N" status.
 *
 * @internal
 */
export function GridPagination({ pagination }: GridPaginationProps) {
	const {
		pageIndex,
		pageSize,
		pageCount,
		rowCount,
		from,
		to,
		canPrevious,
		canNext,
		pageSizeOptions,
		setPageIndex,
		setPageSize,
	} = pagination

	const pageNumber = pageIndex + 1

	const knownPages = pageCount > 0

	const showPicker = pageSizeOptions != null && pageSizeOptions.length > 0

	// Hide the navigation for a single known page (or none); keep it for multiple
	// pages or an unbounded server feed (`pageCount` of -1).
	const showNav = pageCount !== 0 && pageCount !== 1

	const status = pageStatus({ from, to, rowCount, pageNumber, pageCount })

	return (
		<div data-slot="grid-pagination" className={cn(k.footer.bar)}>
			{showNav && (
				<div className={cn(k.footer.nav)}>
					<Pagination>
						<PaginationPrevious
							onClick={() => setPageIndex(pageIndex - 1)}
							disabled={!canPrevious}
						/>

						{knownPages && (
							<PaginationList>
								{getVisiblePages(pageNumber, pageCount).map((item, index) =>
									item === 'gap' ? (
										// biome-ignore lint/suspicious/noArrayIndexKey: gap markers carry no stable identity; their position in the fixed window is their identity
										<PaginationGap key={`gap-${index}`} />
									) : (
										<PaginationPage
											key={item}
											current={item === pageNumber}
											onClick={() => setPageIndex(item - 1)}
										>
											{item}
										</PaginationPage>
									),
								)}
							</PaginationList>
						)}

						<PaginationNext onClick={() => setPageIndex(pageIndex + 1)} disabled={!canNext} />
					</Pagination>
				</div>
			)}

			<div className={cn(k.footer.meta)}>
				<p className={cn(k.footer.status)}>{status}</p>

				<div className={cn(k.footer.controls)}>
					{showPicker && (
						<Select<number>
							aria-label="Rows per page"
							value={pageSize}
							onValueChange={(value) => value != null && setPageSize(value)}
							displayValue={(value) => `${value} / page`}
							placement="top-end"
						>
							{pageSizeOptions.map((option) => (
								<SelectOption key={option} value={option}>
									<SelectLabel>{option}</SelectLabel>
								</SelectOption>
							))}
						</Select>
					)}
				</div>
			</div>
		</div>
	)
}
