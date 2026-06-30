'use client'

import { useLayoutEffect, useRef } from 'react'
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
 * Footer for a paginated {@link Grid}, laid out as three zones: an optional
 * page-size picker, the page navigation, and a row-range status — all driven by
 * the {@link GridPaginationView} the grid's TanStack Table engine resolves. From
 * `lg` they share one row (picker at the start, nav centered, status at the
 * end); below it the nav stacks above a picker/status row. Numbered pages render
 * only when the total page count is known; an unbounded server feed falls back to
 * Previous/Next around a "Page N" status.
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

	// When a page change disables the control the user activated (reaching an
	// extent), or scrolls its number out of the window, the browser drops focus to
	// the body. Restore it to the current-page marker so focus stays in the nav
	// (WCAG 2.4.3 / 2.4.7). Scoped to user-driven changes via `restoreFocus`.
	const navRef = useRef<HTMLDivElement>(null)

	const restoreFocus = useRef(false)

	const goToPage = (index: number) => {
		restoreFocus.current = true

		setPageIndex(index)
	}

	useLayoutEffect(() => {
		// Re-run on each page change so a restore can follow the control that moved.
		void pageIndex

		if (!restoreFocus.current) return

		restoreFocus.current = false

		const nav = navRef.current

		if (!nav) return

		const active = document.activeElement

		// Focus survived on an enabled control still in the nav — leave it. A control
		// that just disabled is dropped (it can't hold focus, even if the browser's
		// blur to the body lags this commit), as is one that unmounted (a number that
		// scrolled out of the window).
		const heldInNav =
			active instanceof HTMLElement &&
			nav.contains(active) &&
			!(active instanceof HTMLButtonElement && active.disabled)

		if (heldInNav) return

		nav.querySelector<HTMLElement>('[aria-current="page"]')?.focus()
	}, [pageIndex])

	return (
		<div data-slot="grid-pagination" className={cn(k.footer.bar)}>
			{showNav && (
				<div ref={navRef} className={cn(k.footer.nav)}>
					<Pagination>
						<PaginationPrevious onClick={() => goToPage(pageIndex - 1)} disabled={!canPrevious} />

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
											onClick={() => goToPage(item - 1)}
										>
											{item}
										</PaginationPage>
									),
								)}
							</PaginationList>
						)}

						<PaginationNext onClick={() => goToPage(pageIndex + 1)} disabled={!canNext} />
					</Pagination>
				</div>
			)}

			<div className={cn(k.footer.meta)}>
				<div className={cn(k.footer.controls)}>
					{showPicker && (
						<Select<number>
							aria-label="Rows per page"
							value={pageSize}
							onValueChange={(value) => value != null && setPageSize(value)}
							displayValue={(value) => `${value} / page`}
							placement="top-start"
						>
							{pageSizeOptions.map((option) => (
								<SelectOption key={option} value={option}>
									<SelectLabel>{option}</SelectLabel>
								</SelectOption>
							))}
						</Select>
					)}
				</div>

				{/* A polite live region so a page/range change is announced without moving
				    focus (WCAG 4.1.3); role="status" stays silent on the initial render. */}
				<p role="status" className={cn(k.footer.status)}>
					{status}
				</p>
			</div>
		</div>
	)
}
