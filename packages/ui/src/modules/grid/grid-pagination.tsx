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
 * Footer for a paginated {@link Grid}, laid out as one row of three zones: an
 * optional page-size picker at the start, the page navigation in the center,
 * and a row-range status at the end. All three are driven by the
 * {@link GridPaginationView} the grid's TanStack Table engine resolves. The
 * footer width, not the viewport, sets the layout. Below `@2xl` the numbered
 * pages hide, and a footer with no picker moves Previous/Next to the start.
 * Numbered pages render only when the total page count is known; an unbounded
 * server feed falls back to Previous/Next beside a "Page N" status.
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
	// (WCAG 2.4.3 / 2.4.7). Scoped to user-driven changes via `restoreFrom`.
	const navRef = useRef<HTMLDivElement>(null)

	// The numbered pages, which hide below the `@2xl` footer width.
	const pagesRef = useRef<HTMLOListElement>(null)

	// Armed by a navigation the reader drives, with the page it leaves, and spent
	// by the first render on another page. That change can land a commit later,
	// when a controlled consumer sets the page in a transition or after a fetch. A
	// navigation onto the page already current changes no index, so it leaves the
	// latch unarmed.
	const restoreFrom = useRef<number | null>(null)

	const goToPage = (index: SetStateAction<number>) => {
		const next = typeof index === 'function' ? index(pageIndex) : index

		restoreFrom.current = next !== pageIndex ? pageIndex : null

		setPageIndex(index)
	}

	useLayoutEffect(() => {
		if (restoreFrom.current === null || restoreFrom.current === pageIndex) return

		restoreFrom.current = null

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

		// The current-page marker takes focus when it shows. Below `@2xl` the
		// numbered pages hide, so the enabled Previous or Next control takes it.
		const pages = pagesRef.current

		const target =
			pages && getComputedStyle(pages).display !== 'none'
				? pages.querySelector<HTMLElement>('[aria-current="page"]')
				: nav.querySelector<HTMLElement>('button:not(:disabled)')

		target?.focus()
	}, [pageIndex])

	return (
		<div data-slot="grid-pagination" className={cn(k.footer.root)}>
			<div className={cn(k.footer.bar)}>
				<div className={cn(k.footer.controls, !showPicker && k.footer.bare.controls)}>
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

				{showNav && (
					<div ref={navRef} className={cn(k.footer.nav, !showPicker && k.footer.bare.nav)}>
						<Pagination>
							<PaginationPrevious
								onClick={() => goToPage((index) => index - 1)}
								disabled={!canPrevious}
							/>

							{knownPages && (
								<PaginationList ref={pagesRef} className={cn(k.footer.pages)}>
									{getVisiblePages(pageNumber, pageCount).map((item) =>
										typeof item === 'string' ? (
											<PaginationGap key={item} />
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

				{/* A polite live region so a page/range change is announced without moving
				    focus (WCAG 4.1.3); role="status" stays silent on the initial render. */}
				<p role="status" className={cn(k.footer.status)}>
					{status}
				</p>
			</div>
		</div>
	)
}
