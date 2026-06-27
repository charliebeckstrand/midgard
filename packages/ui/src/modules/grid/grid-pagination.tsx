'use client'

import { type KeyboardEvent, useEffect, useState } from 'react'
import { Input } from '../../components/input'
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

/** Props for {@link GridJumpToPage}. @internal */
type GridJumpToPageProps = {
	/** 1-based current page. */
	pageNumber: number
	/** Total pages (known and ≥ 1). */
	pageCount: number
	/** Jumps to a 0-based page index. */
	setPageIndex: (index: number) => void
}

/**
 * "Go to page" number entry: a narrow input seeded with the current page that
 * jumps on Enter or blur, clamped to `[1, pageCount]`. The draft re-syncs when
 * the page changes elsewhere (nav buttons, page-size change).
 *
 * @internal
 */
function GridJumpToPage({ pageNumber, pageCount, setPageIndex }: GridJumpToPageProps) {
	const [draft, setDraft] = useState(String(pageNumber))

	useEffect(() => setDraft(String(pageNumber)), [pageNumber])

	const commit = () => {
		const parsed = Number.parseInt(draft, 10)

		if (Number.isNaN(parsed)) {
			setDraft(String(pageNumber))

			return
		}

		const clamped = Math.min(Math.max(parsed, 1), pageCount)

		setPageIndex(clamped - 1)

		setDraft(String(clamped))
	}

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') commit()
	}

	return (
		<div className={cn(k.footer.jump)}>
			<span aria-hidden="true">Go to page</span>

			<Input
				type="number"
				min={1}
				max={pageCount}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={onKeyDown}
				onBlur={commit}
				aria-label="Go to page"
				className={cn(k.footer.jumpInput)}
			/>
		</div>
	)
}

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
		canPrevious,
		canNext,
		pageSizeOptions,
		jumpToPage,
		setPageIndex,
		setPageSize,
	} = pagination

	const pageNumber = pageIndex + 1

	const knownPages = pageCount > 0

	const showPicker = pageSizeOptions != null && pageSizeOptions.length > 0

	// Jumping needs a known, multi-page total to clamp against.
	const showJump = jumpToPage && knownPages && pageCount > 1

	// Hide the navigation for a single known page (or none); keep it for multiple
	// pages or an unbounded server feed (`pageCount` of -1).
	const showNav = pageCount !== 0 && pageCount !== 1

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
				<div className={cn(k.footer.start)}>
					{showPicker && (
						<>
							<span aria-hidden="true" className="sr-only">
								Rows per page
							</span>

							<Select<number>
								aria-label="Rows per page"
								value={pageSize}
								onValueChange={(value) => value != null && setPageSize(value)}
								displayValue={(value) => String(value)}
								placement="top-end"
							>
								{pageSizeOptions.map((option) => (
									<SelectOption key={option} value={option}>
										<SelectLabel>{option}</SelectLabel>
									</SelectOption>
								))}
							</Select>
						</>
					)}

					{showJump && (
						<GridJumpToPage
							pageNumber={pageNumber}
							pageCount={pageCount}
							setPageIndex={setPageIndex}
						/>
					)}
				</div>
			</div>
		</div>
	)
}
