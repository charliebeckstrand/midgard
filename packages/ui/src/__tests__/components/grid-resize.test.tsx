import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, userEvent } from '../helpers'

describe('Grid resizable columns', () => {
	type Row = { id: number; name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, width: '200px', minWidth: 80 },
		{ id: 'age', title: 'Age', cell: (row) => row.age, width: '120px' },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', age: 30 },
		{ id: 2, name: 'Bob', age: 25 },
	]

	const getKey = (row: Row) => row.id

	it('renders a resize separator for each data column when resizable', () => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('separator', { name: 'Resize Name' })).toBeInTheDocument()

		expect(screen.getByRole('separator', { name: 'Resize Age' })).toBeInTheDocument()
	})

	it('resizes columns by default', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('separator', { name: 'Resize Name' })).toBeInTheDocument()

		expect(screen.getByRole('separator', { name: 'Resize Age' })).toBeInTheDocument()
	})

	it('renders no separators when resizable is off', () => {
		renderUI(<Grid resizable={false} columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('separator')).not.toBeInTheDocument()
	})

	it('lays resizable columns out with a fixed-width colgroup', () => {
		const { container } = renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		const table = container.querySelector('table')

		expect(table).toHaveClass('table-fixed')

		const cols = container.querySelectorAll('colgroup col')

		expect(cols).toHaveLength(columns.length)

		// Each column takes its own pixel width and the table is their sum, so a
		// resize grows or shrinks one column (and the table) without redistributing.
		expect((cols[0] as HTMLElement).style.width).toBe('200px')

		expect((cols[1] as HTMLElement).style.width).toBe('120px')

		expect((table as HTMLElement).style.width).toBe('320px')
	})

	it('uses auto layout with no colgroup when resizable is off', () => {
		const { container } = renderUI(
			<Grid resizable={false} columns={columns} rows={rows} getKey={getKey} />,
		)

		expect(container.querySelector('table')).not.toHaveClass('table-fixed')

		expect(container.querySelector('colgroup')).not.toBeInTheDocument()
	})

	it('omits a separator on the selection column', () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'select', selectable: true }, ...columns]}
				rows={rows}
				getKey={getKey}
			/>,
		)

		// One per data column, none for the selection column.
		expect(screen.getAllByRole('separator')).toHaveLength(2)
	})

	it('sizes a width-less selection column to a natural checkbox width', () => {
		const { container } = renderUI(
			<Grid
				resizable
				columns={[{ id: 'select', selectable: true }, ...columns]}
				rows={rows}
				getKey={getKey}
			/>,
		)

		// The checkbox column holds a narrow natural width rather than the engine's
		// 150px default a width-less column would otherwise take.
		const cols = container.querySelectorAll('colgroup col')

		expect((cols[0] as HTMLElement).style.width).toBe('48px')
	})

	it('lets the selection column override its natural width', () => {
		const { container } = renderUI(
			<Grid
				resizable
				columns={[{ id: 'select', selectable: true, width: '64px' }, ...columns]}
				rows={rows}
				getKey={getKey}
			/>,
		)

		const cols = container.querySelectorAll('colgroup col')

		expect((cols[0] as HTMLElement).style.width).toBe('64px')
	})

	it('sizes data-column headers from the engine', () => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		const [nameHeader, ageHeader] = screen.getAllByRole('columnheader')

		expect(nameHeader).toHaveStyle({ width: '200px' })

		expect(ageHeader).toHaveStyle({ width: '120px' })
	})

	it('exposes the width on the separator for assistive tech', () => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		const handle = screen.getByRole('separator', { name: 'Resize Name' })

		expect(handle).toHaveAttribute('aria-valuenow', '200')

		expect(handle).toHaveAttribute('aria-valuemin', '80')
	})

	it('widens a column with ArrowRight', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ onValueChange }}
			/>,
		)

		screen.getByRole('separator', { name: 'Resize Name' }).focus()

		await user.keyboard('{ArrowRight}')

		// 200 + COLUMN_RESIZE_STEP (16)
		expect(onValueChange).toHaveBeenLastCalledWith({ name: 216 })
	})

	it('narrows a column with ArrowLeft', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ onValueChange }}
			/>,
		)

		screen.getByRole('separator', { name: 'Resize Name' }).focus()

		await user.keyboard('{ArrowLeft}')

		expect(onValueChange).toHaveBeenLastCalledWith({ name: 184 })
	})

	it('clamps to the column minimum width', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				resizable
				columns={[
					{ id: 'name', title: 'Name', cell: (row) => row.name, width: '90px', minWidth: 80 },
				]}
				rows={rows}
				getKey={getKey}
				columnSizing={{ onValueChange }}
			/>,
		)

		screen.getByRole('separator', { name: 'Resize Name' }).focus()

		// 90 - 16 = 74, clamped up to the 80px minimum.
		await user.keyboard('{ArrowLeft}')

		expect(onValueChange).toHaveBeenLastCalledWith({ name: 80 })
	})

	it('reflects controlled column widths on the header', () => {
		renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ value: { name: 320, age: 120 } }}
			/>,
		)

		expect(screen.getAllByRole('columnheader')[0]).toHaveStyle({ width: '320px' })
	})
})
