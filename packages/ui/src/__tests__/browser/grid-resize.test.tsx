import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, userEvent, waitFor } from '../helpers'

/**
 * Column resizing against a real layout engine: the handle's full-column height
 * and the hover-revealed grip only resolve in a browser (jsdom paints no layout,
 * so its `offsetHeight` is 0 and computed `opacity` never settles). Here the grid
 * renders with real geometry, so the trailing-edge handle can be measured against
 * the table and a pointer drag can begin down in the body region of that edge.
 */
describe('grid column resizing (real browser)', () => {
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

	const getKey = (row: Row) => row.id

	// A fixed-width frame so auto-fit settles the data columns at a known size
	// instead of stretching them to the viewport.
	function setup(extra?: { onValueChange?: (sizing: Record<string, number>) => void }) {
		const { container } = renderUI(
			<div style={{ width: '400px' }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnSizing={extra?.onValueChange ? { onValueChange: extra.onValueChange } : undefined}
				/>
			</div>,
		)

		const separator = container.querySelector<HTMLElement>(
			'[role="separator"][aria-label="Resize Name"]',
		)

		if (!separator) throw new Error('resize handle not found')

		return { container, separator }
	}

	const nameHeader = (root: HTMLElement) =>
		root.querySelector<HTMLElement>('th[data-grid-col="name"]') as HTMLElement

	it('extends the handle down the full column height, not just the header', async () => {
		const { container, separator } = setup()

		const table = container.querySelector('table') as HTMLElement

		// The handle starts at the header height and grows to the table height once
		// the measured `--grid-resize-height` lands.
		await waitFor(() => {
			const handleHeight = separator.getBoundingClientRect().height
			const tableHeight = table.getBoundingClientRect().height

			expect(handleHeight).toBeCloseTo(tableHeight, 0)
		})

		// And it is decisively taller than the header cell alone — so the right edge
		// is grabbable down every row, not only across the header.
		const headerHeight = nameHeader(container).getBoundingClientRect().height

		expect(separator.getBoundingClientRect().height).toBeGreaterThan(headerHeight * 2)
	})

	it('keeps the grip hidden until the edge or header is hovered', async () => {
		const user = userEvent.setup()

		const { container, separator } = setup()

		const grip = separator.querySelector<HTMLElement>('span[aria-hidden="true"]') as HTMLElement

		// Resting: the grip is hidden, so the edge stays clean until pointed at —
		// the whole point of the change, versus a permanently-visible handle.
		expect(getComputedStyle(grip).opacity).toBe('0')

		// Hovering the edge strip reveals it. The strip spans the body, so this
		// hover lands well below the header yet still lights the grip.
		await user.hover(separator)

		await waitFor(() => expect(getComputedStyle(grip).opacity).toBe('1'))

		// Hovering anywhere on the header cell reveals it too, for discoverability.
		await user.unhover(separator)
		await user.hover(nameHeader(container))

		await waitFor(() => expect(getComputedStyle(grip).opacity).toBe('1'))
	})

	it('resizes the column when the drag begins in the body region of the edge', async () => {
		const onValueChange = vi.fn()

		const { container, separator } = setup({ onValueChange })

		const table = container.querySelector('table') as HTMLElement

		await waitFor(() =>
			expect(separator.getBoundingClientRect().height).toBeCloseTo(
				table.getBoundingClientRect().height,
				0,
			),
		)

		const startWidth = nameHeader(container).getBoundingClientRect().width

		const rect = separator.getBoundingClientRect()
		const startX = rect.left + rect.width / 2

		// Begin the drag near the bottom of the handle — down in the rows, not the
		// header — to prove the whole right side initiates a resize.
		const bodyY = rect.bottom - 16

		fireEvent.mouseDown(separator, { clientX: startX, clientY: bodyY })
		fireEvent.mouseMove(document, { clientX: startX + 70, clientY: bodyY })
		fireEvent.mouseUp(document, { clientX: startX + 70, clientY: bodyY })

		await waitFor(() =>
			expect(nameHeader(container).getBoundingClientRect().width).toBeGreaterThan(startWidth + 40),
		)

		expect(onValueChange).toHaveBeenCalled()
	})
})
