import type { ReactElement } from 'react'
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

	/** The server markup of `grid`, parsed. */
	const serverDocument = (grid: ReactElement) =>
		new DOMParser().parseFromString(renderToString(grid), 'text/html')

	it('holds the data body on the server, so no row is painted at a width that changes', () => {
		const doc = serverDocument(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// Scoped to the table's own tag: the gate lives there rather than on a wrapper,
		// because a wrapping node sits in the middle of the grid's child selectors. It
		// hides each body without `data-grid-placeholder` at zero opacity, not display:
		// the autosizer has to measure those rows to size them, and zero opacity keeps
		// layout and geometry intact.
		const table = doc.querySelector('table')

		expect(table?.className).toContain('[&>tbody:not([data-grid-placeholder])]:opacity-0')

		const body = doc.querySelector('[data-grid-row]')?.closest('tbody')

		expect(body?.hasAttribute('data-grid-placeholder')).toBe(false)
	})

	it('shows the head and one loading row from the server', () => {
		const doc = serverDocument(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// The head is outside the gate, so the column titles paint before hydration.
		expect(doc.querySelector('thead')?.textContent).toContain('Name')

		const skeleton = doc.querySelector('[data-slot="grid-gate-skeleton"]')

		// A body of its own right after the head, which the gate leaves visible.
		expect(skeleton?.tagName).toBe('TBODY')
		expect(skeleton?.previousElementSibling?.tagName).toBe('THEAD')
		expect(skeleton?.hasAttribute('data-grid-placeholder')).toBe(true)

		// The anchor row is hidden from assistive tech, and the placeholder is inert. The
		// placeholder table takes the same column frame, and holds one row of bars.
		expect(skeleton?.querySelector(':scope > tr')?.getAttribute('aria-hidden')).toBe('true')

		const placeholder = skeleton?.querySelector('[inert] > table')

		expect(placeholder?.querySelectorAll('col')).toHaveLength(columns.length)
		expect(placeholder?.querySelectorAll('tr')).toHaveLength(1)
		expect(placeholder?.querySelectorAll('td')).toHaveLength(columns.length)
	})

	it('reserves the maxHeight of a windowed grid on the server', () => {
		const html = renderToString(
			<Grid columns={columns} rows={rows} getKey={getKey} virtualize maxHeight="320px" />,
		)

		const doc = new DOMParser().parseFromString(html, 'text/html')

		const region = doc.querySelector<HTMLElement>('[data-slot="grid-scroll"]')

		// The window has no rows before hydration, so the region holds the height they fill.
		expect(region?.style.height).toBe('320px')
		expect(region?.style.maxHeight).toBe('320px')

		// The skeleton of the window is the loading row, and the gate leaves it visible.
		expect(doc.querySelector('tbody')?.hasAttribute('data-grid-placeholder')).toBe(true)
		expect(doc.querySelector('[data-slot="grid-gate-skeleton"]')).toBeNull()
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
