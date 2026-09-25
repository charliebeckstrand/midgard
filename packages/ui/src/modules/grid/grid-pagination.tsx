'use client'

import { type SetStateAction, useLayoutEffect, useRef } from 'react'
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
import { getVisiblePages } from './engine/grid-pagination-utilities'
import type { GridPaginationView } from './use-grid-table'

/** Props for {@link GridPagination}. @internal */
type GridPaginationProps = {
	pagination: GridPaginationView
}

/**
 * The footer's row-range status: the 1-based slice shown on this page against
 * the known total (`1–10 of 47`), or `No rows` for an empty set. A bare page
 * marker stands in otherwise (`Page 3 of 5`, or `Page 3` for an unbounded server
 * feed whose total is unknown).
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
 * page-size picker, the page navigation, and a row-range status. All three are
 * driven by the {@link GridPaginationView} the grid's TanStack Table engine resolves. From
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

	// Armed by a navigation the reader drives, and spent by the page change that
	// follows it. That change can land a commit later, when a controlled consumer
	// sets the page in a transition or after a fetch. A navigation onto the page
	// already current changes no index, so it leaves the latch unarmed.
	const restoreFocus = useRef(false)

	const goToPage = (index: SetStateAction<number>) => {
		const next = typeof index === 'function' ? index(pageIndex) : index

		restoreFocus.current = next !== pageIndex

		setPageIndex(index)
	}

	useLayoutEffect(() => {
		// Re-run on each page change, so a restore follows a commit that lands late.
		void pageIndex

		if (!restoreFocus.current) return

		restoreFocus.current = false

		const nav = navRef.current

		if (!nav) return

		const active = document.activeElement

		// Move only focus that the change dropped. That is the body, where a number
		// that scrolled out of the window leaves it, or a nav control that just
		// disabled, which cannot hold focus even if the browser's blur lags this
		// commit. Focus that the reader moved elsewhere stays there. A consumer can
		// reject a navigation, and the latch then waits for a later change; this
		// check keeps that change from pulling focus back into the nav.
		const dropped =
			active === null ||
			active === document.body ||
			(active instanceof HTMLButtonElement && active.disabled && nav.contains(active))

		if (!dropped) return

		nav.querySelector<HTMLElement>('[aria-current="page"]')?.focus()
	}, [pageIndex])

	return (
		<div data-slot="grid-pagination" className={cn(k.footer.bar)}>
			{showNav && (
				<div ref={navRef} className={cn(k.footer.nav)}>
					<Pagination>
						<PaginationPrevious
							onClick={() => goToPage((index) => index - 1)}
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
											onClick={() => goToPage(item - 1)}
										>
											{item}
										</PaginationPage>
									),
								)}
							</PaginationList>
						)}

						<PaginationNext onClick={() => goToPage((index) => index + 1)} disabled={!canNext} />
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
