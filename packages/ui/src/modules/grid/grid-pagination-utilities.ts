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
