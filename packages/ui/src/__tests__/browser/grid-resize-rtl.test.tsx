import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { COLUMN_RESIZE_STEP } from '../../modules/grid/engine/grid-constants'
import { fireEvent, present, renderUI, waitFor } from '../helpers'

/**
 * Column resizing in a right-to-left grid. The trailing edge of a header is
 * its inline end, which is the physical left edge. The handle sits there, the
 * header pads that side, and a drag or an arrow key moves that edge. Only a
 * real browser lays out the handle and computes the direction.
 */
describe('grid column resizing in a right-to-left grid (real browser)', () => {
	type Row = { id: number; name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, width: '200px', minWidth: 80 },
		{ id: 'age', title: 'Age', cell: (row) => row.age, width: '120px' },
	]

	const rows: Row[] = Array.from({ length: 6 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		age: 20 + i,
	}))

	function setup() {
		const { container } = renderUI(
			<div dir="rtl" style={{ width: '400px' }}>
				<Grid columns={columns} rows={rows} getKey={(row) => row.id} />
			</div>,
		)

		const separator = present(
			container.querySelector<HTMLElement>('[role="separator"][aria-label="Resize Name"]'),
			'the Name resize handle',
		)

		const header = present(
			container.querySelector<HTMLElement>('th[data-grid-col="name"]'),
			'th[data-grid-col="name"]',
		)

		return { separator, header }
	}

	it('puts the handle and the header padding at the inline end', async () => {
		const { separator, header } = setup()

		await waitFor(() => expect(header.getBoundingClientRect().width).toBeGreaterThan(0))

		const cell = header.getBoundingClientRect()

		const handle = separator.getBoundingClientRect()

		expect(Math.abs(handle.left - cell.left)).toBeLessThanOrEqual(1)

		// The default snug density pads the trailing edge by 16 pixels.
		const style = getComputedStyle(header)

		expect(style.paddingLeft).toBe('16px')

		expect(Number.parseFloat(style.paddingRight)).toBeLessThan(16)
	})

	it('widens the column on a drag toward the physical left', async () => {
		const { separator, header } = setup()

		await waitFor(() => expect(header.getBoundingClientRect().width).toBeGreaterThan(0))

		const start = header.getBoundingClientRect().width

		const rect = separator.getBoundingClientRect()

		const x = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		fireEvent.mouseDown(separator, { clientX: x, clientY: y })

		fireEvent.mouseMove(document, { clientX: x - 70, clientY: y })

		fireEvent.mouseUp(document, { clientX: x - 70, clientY: y })

		await waitFor(() => expect(header.getBoundingClientRect().width).toBeGreaterThan(start + 40))
	})

	it('widens the column on ArrowLeft and narrows it on ArrowRight', async () => {
		const { separator } = setup()

		const size = () => Number(separator.getAttribute('aria-valuenow'))

		await waitFor(() => expect(size()).toBeGreaterThan(0))

		const start = size()

		separator.focus()

		fireEvent.keyDown(separator, { key: 'ArrowLeft' })

		await waitFor(() => expect(size()).toBe(start + COLUMN_RESIZE_STEP))

		fireEvent.keyDown(separator, { key: 'ArrowRight' })

		await waitFor(() => expect(size()).toBe(start))
	})
})
