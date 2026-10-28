import type { GridColumn } from '../../types'
import { collectHeaders } from './measure'

/**
 * How the browser spreads the width of a table that it lays out for a fit (see
 * {@link readFitLayout}).
 *
 * - `fill`: the table fills its container. The browser gives the spare width to
 *   the columns in proportion to their content.
 * - `content`: the table takes the width of its content. Each column takes the
 *   width of its own content, and the container keeps the spare width.
 *
 * The `<table>` carries the value as its `data-grid-fit-layout` attribute, and the fit
 * classes of the grid kata (`k.fit`) read it.
 *
 * @internal
 */
export type GridFitMode = 'fill' | 'content'

/** What one fit layout holds. @internal */
export type GridFitPlan = {
	mode: GridFitMode
	/**
	 * The width (px) of each column that keeps its width through the fit: a
	 * `width` seed, or a non-data column that declares a width. Its `<col>`
	 * holds the width, and the fit classes stop its content from widening it.
	 */
	kept: ReadonlyMap<string, number>
	/**
	 * The smallest width (px) of each column that held wider content in an
	 * earlier pass (see `createColumnSizer`). Its header cell takes the width as
	 * its `min-width`, so a column grows to a wider row and does not shrink when
	 * that row leaves the view.
	 */
	grow: ReadonlyMap<string, number>
}

/**
 * The header cell of each column, by column id. The header row holds one cell
 * for each visible column, in the order of the columns, so the columns index
 * into it. That includes a header with no column id, such as the select-all
 * cell. A row that does not match the column count is mid-render, and the
 * header cells that carry an id stand in (see {@link collectHeaders}).
 *
 * @internal
 */
function headerCells<T>(
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

/**
 * Lays the table out with the browser's automatic table layout, reads the width
 * of each column, and puts the table back as it was. All of it is synchronous,
 * so nothing paints between the writes and the reads.
 *
 * The fit layout is the layout that the server renders before the first fit
 * (see `resolveResizeLayout`). The table carries `data-grid-fit-layout`, it has no
 * inline width, and each `<col>` holds only a kept width. At the first fit the
 * table is in that layout already, so the writes change nothing, and the widths
 * that this reads are the widths on the screen. A later fit writes the same
 * layout over the fixed layout of the grid. Each fit thus applies the same
 * rules, and the browser is the one place that holds them.
 *
 * The widths are border-box widths, and they can be fractional. The fixed
 * layout that the grid sets from them lays the columns out at the same pixels.
 *
 * @returns The width (px) of each column that has a header cell, by column id.
 * @internal
 */
export function readFitLayout<T>(
	container: HTMLElement,
	columns: readonly GridColumn<T>[],
	plan: GridFitPlan,
): Map<string, number> {
	const widths = new Map<string, number>()

	const table = container.querySelector('table')

	if (!table) return widths

	const cols = table.querySelector(':scope > colgroup')?.children ?? []

	const headers = headerCells(container, columns)

	const fit = table.getAttribute('data-grid-fit-layout')

	const width = table.style.width

	const colWidths = [...cols].map((col) => (col as HTMLElement).style.width)

	// A header cell of the fixed layout can carry its width inline, and the automatic
	// layout reads that as the width of its column.
	const headerWidths = [...headers.values()].map((th) => th.style.width)

	table.setAttribute('data-grid-fit-layout', plan.mode)

	table.style.width = ''

	for (const th of headers.values()) th.style.width = ''

	columns.forEach((col, index) => {
		const element = cols[index] as HTMLElement | undefined

		const kept = plan.kept.get(String(col.id))

		if (element) element.style.width = kept == null ? '' : `${kept}px`
	})

	// A kept column holds its width, and a grown column its grown width, also in a
	// table that overflows. The automatic layout shrinks a column to its least width
	// there, which the header sets.
	const least = new Map([...plan.kept, ...plan.grow])

	for (const [id, min] of least) {
		const th = headers.get(id)

		if (th) th.style.minWidth = `${min}px`
	}

	for (const col of columns) {
		const th = headers.get(String(col.id))

		if (th) widths.set(String(col.id), th.getBoundingClientRect().width)
	}

	for (const id of least.keys()) {
		const th = headers.get(id)

		if (th) th.style.minWidth = ''
	}

	;[...headers.values()].forEach((th, index) => {
		th.style.width = headerWidths[index] ?? ''
	})

	;[...cols].forEach((col, index) => {
		;(col as HTMLElement).style.width = colWidths[index] ?? ''
	})

	table.style.width = width

	if (fit == null) table.removeAttribute('data-grid-fit-layout')
	else table.setAttribute('data-grid-fit-layout', fit)

	return widths
}
