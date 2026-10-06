import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, holdMouse, renderUI, screen, setupUser } from '../helpers'

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

	it.each([
		['when resizable', { resizable: true }],
		['by default', {}],
	])('renders a resize separator for each data column %s', (_, props) => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} {...props} />)

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

	const keyboardCases: [string, string, GridColumn<Row>[], number][] = [
		// 200 + COLUMN_RESIZE_STEP (16)
		['widens a column with ArrowRight', '{ArrowRight}', columns, 216],
		['narrows a column with ArrowLeft', '{ArrowLeft}', columns, 184],
		['snaps to the minimum width with Home', '{Home}', columns, 80],
		[
			'snaps to the maximum width with End when the column is bounded',
			'{End}',
			[{ id: 'name', title: 'Name', cell: (row) => row.name, width: '200px', maxWidth: 400 }],
			400,
		],
		// 90 - 16 = 74, clamped up to the 80px minimum.
		[
			'clamps to the column minimum width',
			'{ArrowLeft}',
			[{ id: 'name', title: 'Name', cell: (row) => row.name, width: '90px', minWidth: 80 }],
			80,
		],
	]

	it.each(keyboardCases)('%s', async (_, key, keyed, width) => {
		const user = setupUser()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				resizable
				columns={keyed}
				rows={rows}
				getKey={getKey}
				columnSizing={{ onValueChange }}
			/>,
		)

		screen.getByRole('separator', { name: 'Resize Name' }).focus()

		await user.keyboard(key)

		expect(onValueChange).toHaveBeenLastCalledWith({ name: width })
	})

	it('jumps a coarse step with PageUp and PageDown', async () => {
		const user = setupUser()

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

		// 200 + COLUMN_RESIZE_PAGE_STEP (64)
		await user.keyboard('{PageUp}')

		expect(onValueChange).toHaveBeenLastCalledWith({ name: 264 })

		// 264 - 64, back to the start
		await user.keyboard('{PageDown}')

		expect(onValueChange).toHaveBeenLastCalledWith({ name: 200 })
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

	// The engine's resize handler ends only on `mouseup`. A right-click opens the
	// context menu, which swallows that `mouseup`, so a resize begun on a
	// right-click never ends — the column stays stuck tracking the pointer. The
	// handle starts a resize on a primary press only.
	it('starts a resize on a primary-button press', () => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		const handle = screen.getByRole('separator', { name: 'Resize Name' })

		const held = holdMouse(handle, { button: 0, clientX: 200 })

		expect(handle).toHaveAttribute('data-resizing')

		held.release()
	})

	it.each([
		['a right-button press', { button: 2 }],
		['a macOS Ctrl+click (button 0 + ctrlKey)', { button: 0, ctrlKey: true }],
	])('does not start a resize on %s', (_, init) => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		const handle = screen.getByRole('separator', { name: 'Resize Name' })

		const held = holdMouse(handle, { clientX: 200, ...init })

		expect(handle).not.toHaveAttribute('data-resizing')

		held.release()
	})

	// The engine tracks a drag through document-level listeners. Without a capture,
	// the element under the pointer sets the cursor. A cell or a control with its
	// own cursor then replaces the resize cursor mid-drag.
	it('captures the pointer on the handle for a primary-button press', () => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		const handle = screen.getByRole('separator', { name: 'Resize Name' })

		fireEvent.pointerDown(handle, { pointerId: 1, isPrimary: true, button: 0, clientX: 200 })

		expect(handle.hasPointerCapture(1)).toBe(true)
	})

	it.each([
		['a right-button press', { button: 2 }],
		['a macOS Ctrl+click', { button: 0, ctrlKey: true }],
		[
			'a second touch (not the primary pointer)',
			{ pointerType: 'touch', isPrimary: false, button: 0 },
		],
	])('does not capture the pointer on %s', (_, init) => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		const handle = screen.getByRole('separator', { name: 'Resize Name' })

		fireEvent.pointerDown(handle, { pointerId: 1, isPrimary: true, clientX: 200, ...init })

		expect(handle.hasPointerCapture(1)).toBe(false)
	})

	// A column drag-resize sweeps the pointer across the rows; the shared
	// `<Table hover>` wash would light each one up mid-drag, so the grid drops it
	// until the drag ends.
	it('drops the hover wash while a column resize is in flight', () => {
		const { container } = renderUI(
			<Grid resizable hover columns={columns} rows={rows} getKey={getKey} />,
		)

		const table = container.querySelector('table')

		// The `hover` grid paints the shared `<Table hover>` wash at rest.
		expect(table?.className).toContain('[&>tbody>tr]:hover:bg-zinc-950/5')

		const held = holdMouse(screen.getByRole('separator', { name: 'Resize Name' }), {
			button: 0,
			clientX: 200,
		})

		expect(table?.className).not.toContain('[&>tbody>tr]:hover:bg-zinc-950/5')

		held.release()
	})

	// The drag lifecycle brackets a pointer resize: the engine flags the column on
	// `mousedown` and clears it on the document-level `mouseup`.
	it('fires onResizeStart on a primary-button press and onResizeEnd on release', () => {
		const onResizeStart = vi.fn()

		const onResizeEnd = vi.fn()

		renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ onResizeStart, onResizeEnd }}
			/>,
		)

		const held = holdMouse(screen.getByRole('separator', { name: 'Resize Name' }), {
			button: 0,
			clientX: 200,
		})

		expect(onResizeStart).toHaveBeenCalledOnce()

		expect(onResizeStart).toHaveBeenCalledWith('name')

		expect(onResizeEnd).not.toHaveBeenCalled()

		// The engine ends the drag on a document-level mouseup.
		held.release()

		expect(onResizeEnd).toHaveBeenCalledOnce()

		expect(onResizeEnd).toHaveBeenCalledWith('name')
	})

	it('fires onResizeEnd when the grid unmounts during a drag', () => {
		const onResizeEnd = vi.fn()

		const view = renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ onResizeEnd }}
			/>,
		)

		const held = holdMouse(screen.getByRole('separator', { name: 'Resize Name' }), {
			button: 0,
			clientX: 200,
		})

		view.unmount()

		expect(onResizeEnd).toHaveBeenCalledOnce()

		expect(onResizeEnd).toHaveBeenCalledWith('name')

		held.release()

		expect(onResizeEnd).toHaveBeenCalledOnce()
	})

	it('does not fire the resize lifecycle for a keyboard nudge', async () => {
		const user = setupUser()

		const onResizeStart = vi.fn()

		const onResizeEnd = vi.fn()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ onResizeStart, onResizeEnd, onValueChange }}
			/>,
		)

		screen.getByRole('separator', { name: 'Resize Name' }).focus()

		await user.keyboard('{ArrowRight}')

		// The width commits, but a keyboard nudge has no drag lifecycle.
		expect(onValueChange).toHaveBeenCalled()

		expect(onResizeStart).not.toHaveBeenCalled()

		expect(onResizeEnd).not.toHaveBeenCalled()
	})
})
