import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen, setupUser } from '../helpers'

/**
 * A grid whose widths the browser sizes keeps the automatic table layout, with no
 * width that the engine computed, on the server and in each render. The browser sizes
 * the columns of the first paint from their content, and hydration keeps that layout.
 * A server paint thus shows the final widths.
 *
 * The server cases assert against `renderToString`, because the server render is the
 * paint that must not change, and no layout effect runs there.
 */
describe('grid automatic layout', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name, minWidth: 90 },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Developer' }]

	const getKey = (row: Row) => row.id

	/** The server markup of `grid`, parsed. */
	const serverDocument = (grid: ReactElement) =>
		new DOMParser().parseFromString(renderToString(grid), 'text/html')

	it('renders the automatic layout and the rows on the server', () => {
		const doc = serverDocument(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const table = doc.querySelector('table')

		expect(table?.getAttribute('data-grid-fit-layout')).toBe('fill')

		// No width of the engine: the browser sizes the table and each column.
		expect(table?.style.width).toBe('')

		for (const col of doc.querySelectorAll<HTMLElement>('colgroup col')) {
			expect(col.style.width).toBe('')
		}

		for (const th of doc.querySelectorAll<HTMLElement>('thead th')) {
			expect(th.style.width).toBe('')
		}

		// The rows paint from the server, so the browser sizes the columns from them.
		expect(doc.querySelectorAll('tbody [data-grid-row]')).toHaveLength(rows.length)
	})

	it('gives a column its minWidth as its least width', () => {
		const doc = serverDocument(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const name = doc.querySelector<HTMLElement>('th[data-grid-col="name"]')

		expect(name?.style.getPropertyValue('--grid-min')).toBe('90px')
	})

	it('keeps a width seed', () => {
		const seeded: GridColumn<Row>[] = [{ ...(columns[0] as GridColumn<Row>), width: 200 }]

		const doc = serverDocument(<Grid columns={seeded} rows={rows} getKey={getKey} />)

		expect(doc.querySelector<HTMLElement>('colgroup col')?.style.width).toBe('200px')

		// The seed is also the least width, so a table that overflows keeps it.
		const th = doc.querySelector<HTMLElement>('th[data-grid-col="name"]')

		expect(th?.style.getPropertyValue('--grid-min')).toBe('200px')
	})

	it('takes the content mode for a grid of width fit', () => {
		const doc = serverDocument(<Grid columns={columns} rows={rows} getKey={getKey} width="fit" />)

		expect(doc.querySelector('table')?.getAttribute('data-grid-fit-layout')).toBe('content')
	})

	it('renders saved widths in the fixed layout on the server', () => {
		const doc = serverDocument(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ defaultValue: { name: 160, role: 120 } }}
			/>,
		)

		const table = doc.querySelector<HTMLElement>('table')

		expect(table?.hasAttribute('data-grid-fit-layout')).toBe(false)

		expect(doc.querySelector<HTMLElement>('colgroup col')?.style.width).toBe('160px')
	})

	it('renders the first window of a windowed grid on the server', () => {
		const many: Row[] = Array.from({ length: 200 }, (_, id) => ({
			id,
			name: `Name ${id}`,
			role: 'Developer',
		}))

		const doc = serverDocument(
			<Grid columns={columns} rows={many} getKey={getKey} virtualize maxHeight="320px" />,
		)

		const rendered = doc.querySelectorAll('tbody [data-grid-row]').length

		// The window assumes a scroller size until the scroller measures, so the first rows
		// paint from the server, and only the first rows.
		expect(rendered).toBeGreaterThan(0)
		expect(rendered).toBeLessThan(many.length)

		expect(doc.querySelector('tr[data-grid-placeholder]')).toBeNull()

		const region = doc.querySelector<HTMLElement>('[data-slot="grid-scroll"]')

		expect(region?.style.maxHeight).toBe('320px')
		expect(region?.style.height).toBe('')
	})

	it('renders no automatic layout for a grid that it never sizes', () => {
		const doc = serverDocument(
			<Grid columns={columns} rows={rows} getKey={getKey} resizable={false} />,
		)

		expect(doc.querySelector('table')?.hasAttribute('data-grid-fit-layout')).toBe(false)
	})

	// jsdom has no layout, so no pass can read a width. The automatic layout stays, and
	// the separators show.
	it('keeps the automatic layout where nothing can measure', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(document.querySelector('table')).toHaveAttribute('data-grid-fit-layout', 'fill')

		expect(document.querySelector('table')).not.toHaveAttribute('data-grid-fit-held')

		expect(screen.getByRole('separator', { name: 'Resize Name' })).toBeInTheDocument()
	})

	it('takes the fixed layout when a keyboard nudge takes control', async () => {
		const user = setupUser()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		screen.getByRole('separator', { name: 'Resize Name' }).focus()

		await user.keyboard('{ArrowRight}')

		const table = document.querySelector('table')

		expect(table).not.toHaveAttribute('data-grid-fit-layout')

		expect(table).toHaveClass('table-fixed')
	})

	it('gives the widths back to the automatic layout on a reset', async () => {
		const user = setupUser()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		screen.getByRole('separator', { name: 'Resize Name' }).focus()

		await user.keyboard('{ArrowRight}')

		const name = screen.getAllByRole('columnheader').find((th) => th.textContent?.includes('Name'))

		fireEvent.contextMenu(name as HTMLElement)

		fireEvent.click(screen.getByRole('menuitem', { name: 'Auto-size' }))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Reset column widths' }))

		expect(document.querySelector('table')).toHaveAttribute('data-grid-fit-layout', 'fill')
	})
})
