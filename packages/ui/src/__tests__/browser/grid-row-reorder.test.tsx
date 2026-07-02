import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

/**
 * Row drag-reorder over a real pointer drag: each row is a vertical @dnd-kit
 * sortable, and dropping one past another commits the reordered rows through
 * `rowReorder.onReorder`. Real pointer geometry past the activation distance, so
 * this runs in the browser suite (jsdom can't drive dnd-kit's sensors); the
 * jsdom suite pins the render gate instead.
 */
describe('grid row reorder: a drag commits the new order (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'drag', dragHandle: true },
		{ id: 'name', title: 'Name', cell: (r) => r.name, width: '160px' },
	]

	const initial: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
		{ id: 3, name: 'Carol' },
	]

	const raf = () =>
		new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())))

	it('moves the first row below the second on drop', async () => {
		const onReorder = vi.fn()

		function Harness() {
			const [rows, setRows] = useState(initial)

			return (
				<Grid
					columns={columns}
					rows={rows}
					getKey={(r) => r.id}
					rowLabel={(r) => r.name}
					rowReorder={{
						onReorder: (next) => {
							onReorder(next)

							setRows(next)
						},
					}}
				/>
			)
		}

		renderUI(<Harness />)

		const grip = screen.getByRole('button', { name: 'Reorder Alice' })

		const bobGrip = screen.getByRole('button', { name: 'Reorder Bob' })

		const from = grip.getBoundingClientRect()

		const bob = bobGrip.getBoundingClientRect()

		// Lift Alice's grip and drag it just past Bob's midpoint — one slot down — then drop.
		const target = bob.y + bob.height / 2 + 2

		fireEvent.pointerDown(grip, {
			isPrimary: true,
			button: 0,
			clientX: from.x + 5,
			clientY: from.y + 5,
		})

		fireEvent.pointerMove(grip, { clientX: from.x + 5, clientY: from.y + 12 })

		await raf()

		fireEvent.pointerMove(grip, { clientX: from.x + 5, clientY: target })

		await raf()

		fireEvent.pointerUp(grip, { clientX: from.x + 5, clientY: target })

		await raf()

		expect(onReorder).toHaveBeenCalledTimes(1)

		// Alice moved below Bob; Carol holds last.
		expect(onReorder.mock.calls[0]?.[0].map((r: Row) => r.name)).toEqual(['Bob', 'Alice', 'Carol'])
	})
})
