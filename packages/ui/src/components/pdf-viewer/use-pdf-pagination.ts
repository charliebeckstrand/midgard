'use client'

import { useControllable } from '../../hooks'

export type UsePdfPaginationInput = {
	total: number
	/** Controlled 1-based page. */
	page?: number
	/** Initial 1-based page in uncontrolled mode. */
	defaultPage: number
	onPageChange?: (page: number) => void
}

export type UsePdfPaginationResult = {
	/** Current page clamped to `[1, total]`, or `0` when `total === 0`. */
	safePage: number
	/** Clamp, round, and commit a page number. No-op when `total === 0`. */
	goToPage: (next: number) => void
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * Manages 1-based page state for the PDF viewer in both controlled and
 * uncontrolled modes, exposing a clamped `safePage` and a `goToPage` setter
 * that rounds and bounds incoming values.
 */
export function usePdfPagination(input: UsePdfPaginationInput): UsePdfPaginationResult {
	const { total, page, defaultPage, onPageChange } = input

	const [currentPage = defaultPage, setCurrentPage] = useControllable<number>({
		value: page,
		defaultValue: defaultPage,
		onChange: (next) => {
			if (next !== undefined) onPageChange?.(next)
		},
	})

	const safePage = total > 0 ? clamp(currentPage, 1, total) : 0

	const goToPage = (next: number) => {
		if (total === 0) return

		setCurrentPage(clamp(Math.round(next), 1, total))
	}

	return { safePage, goToPage }
}
