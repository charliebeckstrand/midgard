import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

/**
 * The column jump is a server-side paint of a width that is about to change: SSR has
 * measured nothing, so its colgroup carries the declared widths, and the fit that runs at
 * hydration replaces them. Nothing can content-fit before the DOM exists, so the grid
 * holds its paint until the first width pass has run.
 *
 * Asserted against `renderToString` rather than a browser, because the server render *is*
 * the thing that used to paint wrong, and it is the one environment where no layout
 * effect can rescue it.
 */
describe('grid width settling', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name, minWidth: 90 },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role, minWidth: 90 },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Developer' }]

	const getKey = (row: Row) => row.id

	it('renders the table hidden on the server, so no width is painted twice', () => {
		const html = renderToString(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// Scoped to the table's own tag: the gate lives there rather than on a wrapper,
		// because a wrapping node sits in the middle of the grid's child selectors.
		const tableTag = html.match(/<table[^>]*>/)?.[0] ?? ''

		expect(tableTag).not.toBe('')

		// `opacity-0`, not display: the autosizer has to measure this table to size it,
		// and zero opacity keeps layout and geometry intact.
		expect(tableTag).toContain('opacity-0')
	})

	it('shows the loading skeleton over the gated table on the server', () => {
		const html = renderToString(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const skeleton = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-slot="grid-gate-skeleton"]')

		// Inert, so the placeholder takes no focus and assistive tech reads the gated
		// table alone. A header row and the one loading row, with a bar in each cell.
		expect(skeleton?.hasAttribute('inert')).toBe(true)
		expect(skeleton?.querySelectorAll('tr')).toHaveLength(2)
		expect(skeleton?.querySelectorAll('th, td')).toHaveLength(columns.length * 2)
	})

	it('reserves the maxHeight of a windowed grid on the server', () => {
		const html = renderToString(
			<Grid columns={columns} rows={rows} getKey={getKey} virtualize maxHeight="320px" />,
		)

		const region = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector<HTMLElement>('[data-slot="grid-scroll"]')

		// The window has no rows before hydration, so the region holds the height they fill.
		expect(region?.style.height).toBe('320px')
		expect(region?.style.maxHeight).toBe('320px')
	})

	it('leaves a grid it never sizes visible on the server', () => {
		// Not resizable, so no fit will ever run and there is nothing to wait for.
		const html = renderToString(
			<Grid columns={columns} rows={rows} getKey={getKey} resizable={false} />,
		)

		const tableTag = html.match(/<table[^>]*>/)?.[0] ?? ''

		expect(tableTag).not.toBe('')
		expect(tableTag).not.toContain('opacity-0')
		expect(html).not.toContain('grid-gate-skeleton')
	})

	// jsdom has no `ResizeObserver`, so this is the "nothing will ever fit these columns"
	// bail: worth pinning, because that path hanging hidden would blank every grid in
	// every jsdom test and in any environment without the observer.
	it('reveals where no ResizeObserver exists rather than hanging hidden', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// The layout effect has run by now, so the gate is open. The loading-path cases live
		// in the browser suite, where the observer is real and rows genuinely measure.
		const table = document.querySelector('table')

		expect(table).not.toBeNull()
		expect(table?.className ?? '').not.toContain('opacity-0')
		expect(document.querySelector('[data-slot="grid-gate-skeleton"]')).toBeNull()
		expect(screen.getByRole('columnheader', { name: /Name/ })).toBeVisible()
	})
})
