import { present } from './present'

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

/**
 * The data cell of a column in a grid: the `td` with that `data-grid-col`.
 *
 * @param root - The node to search.
 * @param column - The id of the column.
 * @param row - The index of the cell in that column, in document order.
 * @returns The cell.
 * @throws When no such cell is present.
 */
export function gridCell(root: ParentNode, column: string, row = 0): HTMLElement {
	const selector = `td[data-grid-col="${column}"]`

	return present(root.querySelectorAll(selector)[row], `${selector} at index ${row}`)
}

/**
 * The header cell of a column in a grid: the `th` with that `data-grid-col`.
 *
 * @param root - The node to search.
 * @param column - The id of the column.
 * @returns The header cell.
 * @throws When no such header cell is present.
 */
export function gridHeader(root: ParentNode, column: string): HTMLElement {
	const selector = `th[data-grid-col="${column}"]`

	return present(root.querySelector(selector), selector)
}
