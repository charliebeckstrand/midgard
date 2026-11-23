import { useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { loadGridReorderKit } from '../../modules/grid/grid-region'
import { ControlLockContext } from '../../primitives/control/context'
import { act, renderUI, screen } from '../helpers'
import { drag } from './helpers/drag'

// The grid loads its drag and drop module as it mounts. The load before the
// cases gives each case the state of a page that already loaded the module,
// so a drag right after the render reaches a sortable.
beforeAll(() => loadGridReorderKit())

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
		{ id: 'name', title: 'Name', cell: (row) => row.name, width: '160px' },
	]

	const initial: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
		{ id: 3, name: 'Carol' },
	]

	it('moves the first row below the second on drop', async () => {
		const onReorder = vi.fn()

		function Harness() {
			const [rows, setRows] = useState(initial)

			return (
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					rowLabel={(row) => row.name}
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

		// Lift Alice's grip and drag it just past Bob's midpoint (one slot down) then drop.
		const target = bob.y + bob.height / 2 + 2

		const x = from.x + 5

		const held = await drag(grip, { x, y: from.y + 5 }, [
			{ x, y: from.y + 12 },
			{ x, y: target },
		])

		await held.release()

		expect(onReorder).toHaveBeenCalledTimes(1)

		// Alice moved below Bob; Carol holds last.
		expect(onReorder.mock.calls[0]?.[0].map((row: Row) => row.name)).toEqual([
			'Bob',
			'Alice',
			'Carol',
		])
	})
	it('makes a drop after a lock arrives a cancel, and keeps the grips', async () => {
		const onReorder = vi.fn()

		let lock: () => void = () => {}

		function Harness() {
			const [rows, setRows] = useState(initial)

			const [locked, setLocked] = useState(false)

			lock = () => setLocked(true)

			return (
				<ControlLockContext value={locked}>
					<Grid
						columns={columns}
						rows={rows}
						getKey={(row) => row.id}
						rowLabel={(row) => row.name}
						rowReorder={{
							onReorder: (next) => {
								onReorder(next)

								setRows(next)
							},
						}}
					/>
				</ControlLockContext>
			)
		}

		renderUI(<Harness />)

		const grip = screen.getByRole('button', { name: 'Reorder Alice' })

		const bob = screen.getByRole('button', { name: 'Reorder Bob' }).getBoundingClientRect()

		const from = grip.getBoundingClientRect()

		const x = from.x + 5

		const held = await drag(grip, { x, y: from.y + 5 }, [
			{ x, y: from.y + 12 },
			{ x, y: bob.y + bob.height / 2 + 2 },
		])

		// A submit locks the grid while the row is in the air.
		await act(async () => lock())

		await held.release()

		expect(onReorder).not.toHaveBeenCalled()

		// The drop is a cancel, so the live region of dnd-kit says that the row went
		// back. It does not say that a drop moved it.
		const region = () => document.querySelector('[id^="DndLiveRegion"]')?.textContent ?? ''

		await expect.poll(region).toContain('Returned Alice to position 1 of 3.')

		expect(region()).not.toContain('Dropped')

		// The lock changes no render: each row keeps its grip.
		expect(screen.getAllByRole('button', { name: /^Reorder / })).toHaveLength(initial.length)
	})
})
