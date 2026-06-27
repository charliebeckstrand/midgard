import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

/**
 * Column pinning chrome in jsdom: the sticky classes and the inline offset styles
 * the cells carry. The offsets come from the engine's size model (deterministic
 * from each column's width), so they assert here even though jsdom paints no
 * sticky layout — the real frozen behaviour is covered by the browser suite.
 */
describe('Grid column pinning', () => {
	type Row = { id: number; name: string; email: string; status: string }

	const rows: Row[] = [
		{ id: 1, name: 'Ada', email: 'ada@example.com', status: 'active' },
		{ id: 2, name: 'Bo', email: 'bo@example.com', status: 'inactive' },
	]

	const getKey = (row: Row) => row.id

	const headCell = (root: HTMLElement, id: string) =>
		root.querySelector<HTMLElement>(`th[data-grid-col="${id}"]`)

	const dataCell = (root: HTMLElement, id: string) =>
		root.querySelector<HTMLElement>(`td[data-grid-col="${id}"]`)

	it('sticks a left-pinned column to the left edge in both header and body', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
			{ id: 'status', title: 'Status', cell: (row) => row.status },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const head = headCell(container, 'name')

		expect(head?.className).toContain('sticky')

		expect(head?.style.left).toBe('0px')

		const body = dataCell(container, 'name')

		expect(body?.className).toContain('sticky')

		expect(body?.style.left).toBe('0px')
	})

	it('treats pinned: true as left', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: true },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(headCell(container, 'name')?.style.left).toBe('0px')

		expect(headCell(container, 'name')?.style.right).toBe('')
	})

	it('pulls a right-pinned column to the right edge', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
			{ id: 'status', title: 'Status', cell: (row) => row.status, pinned: 'right' },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const head = headCell(container, 'status')

		expect(head?.className).toContain('sticky')

		expect(head?.style.right).toBe('0px')

		expect(dataCell(container, 'status')?.style.right).toBe('0px')
	})

	it('stacks two left-pinned columns with cumulative offsets', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email, pinned: 'left' },
			{ id: 'status', title: 'Status', cell: (row) => row.status },
		]

		const { container } = renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				// Controlled widths stand auto-fit down and fix the engine sizes the
				// offsets sum from.
				columnSizing={{ value: { name: 120, email: 200, status: 100 } }}
			/>,
		)

		// The first frozen column sits at the edge; the second starts after it.
		expect(headCell(container, 'name')?.style.left).toBe('0px')

		expect(headCell(container, 'email')?.style.left).toBe('120px')
	})

	it('stacks two right-pinned columns inward from the right edge', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{ id: 'email', title: 'Email', cell: (row) => row.email, pinned: 'right' },
			{ id: 'status', title: 'Status', cell: (row) => row.status, pinned: 'right' },
		]

		const { container } = renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ value: { name: 120, email: 200, status: 100 } }}
			/>,
		)

		// Status is rightmost (offset 0); email stacks inward by status's 100px.
		expect(headCell(container, 'status')?.style.right).toBe('0px')

		expect(headCell(container, 'email')?.style.right).toBe('100px')
	})

	it('paints a pinned body cell with the viewport-aware content-host surface', () => {
		// Regression: a plain `bg.surface` (`dark:bg-zinc-900`) matched only the
		// desktop card, so on mobile — where the content block is transparent over
		// the darker page — the frozen columns read a shade off. The fill now tracks
		// the host: the page background below `lg`, the card surface at `lg`.
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const body = dataCell(container, 'name')

		expect(body?.className).toContain('dark:bg-zinc-950')

		expect(body?.className).toContain('dark:lg:bg-zinc-900')
	})

	it('carries no sticky chrome when no column is pinned', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const head = headCell(container, 'name')

		expect(head?.className).not.toContain('sticky')

		expect(head?.style.left).toBe('')

		expect(head?.style.right).toBe('')
	})

	it('marks a pinned column header with a side-labelled pin icon', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
			{ id: 'status', title: 'Status', cell: (row) => row.status, pinned: 'right' },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// Each frozen header leads its title with a pin indicator named for its edge.
		expect(headCell(container, 'name')?.querySelector('[aria-label="Pinned left"]')).not.toBeNull()

		expect(
			headCell(container, 'status')?.querySelector('[aria-label="Pinned right"]'),
		).not.toBeNull()

		// The scrolling column's header carries none.
		expect(headCell(container, 'email')?.querySelector('[aria-label^="Pinned"]')).toBeNull()
	})
})
