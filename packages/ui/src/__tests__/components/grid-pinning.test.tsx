import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

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

	it('paints a pinned header cell with the viewport-aware content-host surface', () => {
		// Regression: the pinned header kept a plain `bg.surface` (`dark:bg-zinc-900`)
		// while the body cell already tracked the host, so on mobile — where the
		// content block is transparent over the darker page — the frozen header stood
		// out as a box. It now shares the body cell's viewport-aware fill.
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const head = headCell(container, 'name')

		expect(head?.className).toContain('dark:bg-zinc-950')

		expect(head?.className).toContain('dark:lg:bg-zinc-900')
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

	it('freezes the selection column to the far left, ahead of a left-pinned column', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// The checkbox column is the first cell and sticks at the very left edge.
		const selectHead = container.querySelector<HTMLElement>('thead th')

		expect(selectHead?.className).toContain('sticky')

		expect(selectHead?.style.left).toBe('0px')

		const selectBody = container.querySelector<HTMLElement>('tbody td')

		expect(selectBody?.className).toContain('sticky')

		expect(selectBody?.style.left).toBe('0px')

		// The left-pinned data column stacks just inside it, offset by the selection
		// column's natural 48px width.
		expect(headCell(container, 'name')?.style.left).toBe('48px')

		expect(dataCell(container, 'name')?.style.left).toBe('48px')
	})

	it('leaves the selection column inline when no data column is pinned', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// With nothing pinned the checkbox column carries no sticky chrome — it sits
		// inline like any column, so an ordinary grid gains no frozen boundary.
		const selectHead = container.querySelector<HTMLElement>('thead th')

		expect(selectHead?.className).not.toContain('sticky')

		expect(selectHead?.style.left).toBe('')
	})

	it('gives a pinned column header an unpin button and leaves scrolling headers without one', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
			{ id: 'status', title: 'Status', cell: (row) => row.status, pinned: 'right' },
		]

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// Each frozen header carries a pin button that unpins its own column.
		expect(screen.getByRole('button', { name: 'Unpin Name' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Unpin Status' })).toBeInTheDocument()

		// The scrolling column's header carries none.
		expect(screen.queryByRole('button', { name: 'Unpin Email' })).not.toBeInTheDocument()
	})

	it('releases a column when its header pin button is clicked', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(headCell(container, 'name')?.className).toContain('sticky')

		fireEvent.click(screen.getByRole('button', { name: 'Unpin Name' }))

		const head = headCell(container, 'name')

		expect(head?.className).not.toContain('sticky')

		expect(head?.style.left).toBe('')
	})

	it('freezes a locked column to its edge like a pinned one', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, locked: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
			{ id: 'status', title: 'Status', cell: (row) => row.status, locked: 'right' },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(headCell(container, 'name')?.className).toContain('sticky')

		expect(headCell(container, 'name')?.style.left).toBe('0px')

		expect(dataCell(container, 'name')?.style.left).toBe('0px')

		expect(headCell(container, 'status')?.className).toContain('sticky')

		expect(headCell(container, 'status')?.style.right).toBe('0px')
	})

	it('treats locked: true as left', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, locked: true },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(headCell(container, 'name')?.style.left).toBe('0px')

		expect(headCell(container, 'name')?.style.right).toBe('')
	})

	it('gives a locked column header no unpin button while a pinned one keeps it', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, locked: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email, pinned: 'right' },
		]

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// The pinned column carries an unpin button; the locked column never does —
		// its freeze can't be released from the grid.
		expect(screen.getByRole('button', { name: 'Unpin Email' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Unpin Name' })).not.toBeInTheDocument()
	})

	it('does not reorder or unpin a locked column from the header', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, locked: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
			{ id: 'status', title: 'Status', cell: (row) => row.status },
		]

		renderUI(<Grid reorder columns={columns} rows={rows} getKey={getKey} />)

		// A locked column is excluded from drag-reorder (no grip) like a pinned one.
		expect(screen.queryByRole('button', { name: 'Reorder Name' })).not.toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Reorder Email' })).toBeInTheDocument()
	})
})
