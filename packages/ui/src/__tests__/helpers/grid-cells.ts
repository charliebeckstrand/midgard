/**
 * The data cells of each grid in `root`, in document order: each element with
 * `role="gridcell"`.
 *
 * Use it where a case finds a cell by its position, many times in a case, and
 * the case is not about roles. A role query computes the role and the
 * visibility of each element in the document on each call. In the range suites,
 * which read each cell of the grid after each step, those calls took about a
 * third of the time. Each grid cell sets its role as an attribute, so the
 * attribute selector finds the same cells.
 *
 * @param root - The node to search.
 * @returns The cells.
 */
export function gridCells(root: ParentNode = document): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>('[role="gridcell"]')]
}
