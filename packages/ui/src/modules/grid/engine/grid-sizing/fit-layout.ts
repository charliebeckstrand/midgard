import type { GridColumn } from '../../types'
import { collectHeaders } from './measure'

/**
 * How the browser spreads the width of a table in the automatic table layout,
 * which a grid keeps while the browser sizes its columns (see
 * `createColumnSizer`).
 *
 * - `fill`: the table fills its container. The browser gives the spare width to
 *   the columns in proportion to their content.
 * - `content`: the table takes the width of its content. Each column takes the
 *   width of its own content, and the container keeps the spare width.
 *
 * The `<table>` carries the value as its `data-grid-fit-layout` attribute, and
 * the fit classes of the grid kata (`k.fit`) read it.
 *
 * @internal
 */
export type GridFitMode = 'fill' | 'content'

/**
 * The header cell of each column, by column id. The header row holds one cell
 * for each visible column, in the order of the columns, so the columns index
 * into it. That includes a header with no column id, such as the select-all
 * cell. A row that does not match the column count is mid-render, and the
 * header cells that carry an id stand in (see {@link collectHeaders}).
 *
 * @internal
 */
export function headerCells<T>(
	container: HTMLElement,
	columns: readonly GridColumn<T>[],
): Map<string, HTMLElement> {
	const row = container.querySelector('thead th[data-grid-col]')?.parentElement

	const cells = row ? [...row.children] : []

	if (cells.length !== columns.length) return collectHeaders(container)

	const headers = new Map<string, HTMLElement>()

	columns.forEach((col, index) => {
		const cell = cells[index]

		if (cell instanceof HTMLElement) headers.set(String(col.id), cell)
	})

	return headers
}
