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
 * Footer for a paginated {@link Grid}: a row-range status, an optional
 * page-size picker, and the page navigation, all driven by the
 * {@link GridPaginationView} the grid's TanStack Table engine resolves. Numbered
 * pages render only when the total page count is known; an unbounded server feed
 * falls back to Previous/Next around a "Page N" label.
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

	const status =
		rowCount != null
			? rowCount === 0
				? 'No results'
				: `${from}–${to} of ${rowCount}`
			: knownPages
				? `Page ${pageNumber} of ${pageCount}`
				: `Page ${pageNumber}`

	const showPicker = pageSizeOptions != null && pageSizeOptions.length > 0

	// Hide the navigation for a single known page (or none); keep it for multiple
	// pages or an unbounded server feed (`pageCount` of -1).
	const showNav = pageCount !== 0 && pageCount !== 1

	return (
		<div data-slot="grid-pagination" className={cn(k.footer.bar)}>
			<div className={cn(k.footer.start)}>
				{showPicker && (
					<>
						<span aria-hidden="true">Rows per page</span>

						<Select<number>
							aria-label="Rows per page"
							value={pageSize}
							onValueChange={(value) => value != null && setPageSize(value)}
							displayValue={(value) => String(value)}
							placement="top-start"
						>
							{pageSizeOptions.map((option) => (
								<SelectOption key={option} value={option}>
									<SelectLabel>{option}</SelectLabel>
								</SelectOption>
							))}
						</Select>
					</>
				)}
			</div>

			<div className={cn(k.footer.center)}>
				{showNav && (
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
				)}
			</div>

			<span data-slot="grid-pagination-status" className={cn(k.footer.status)} aria-live="polite">
				{status}
			</span>
		</div>
	)
}
