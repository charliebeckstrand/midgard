import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * Editor validation messages stay in view (WCAG 1.4.10). The message renders below
 * the cell, so an edited cell at the scroll container's bottom edge would clip it;
 * it scrolls into view when it appears. Real browser — the clip and the
 * scroll-into-view both need a layout engine.
 */
describe('grid edit validation visibility (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			field: 'name',
			cell: (row) => row.name,
			validate: (value) => (value === 'bad' ? 'Enter a valid name' : null),
		},
	]

	const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	/** The nearest scrollable ancestor — the grid's overflow wrapper. */
	const scrollParent = (el: HTMLElement): HTMLElement | null => {
		let node = el.parentElement

		while (node) {
			const overflowY = getComputedStyle(node).overflowY

			if (
				(overflowY === 'auto' || overflowY === 'scroll') &&
				node.scrollHeight > node.clientHeight
			) {
				return node
			}

			node = node.parentElement
		}

		return null
	}

	function Harness() {
		const [editing, setEditing] = useState<Set<string | number>>(new Set())

		return (
			<div style={{ width: '320px' }}>
				<button type="button" onClick={() => setEditing(new Set([12]))}>
					edit-last
				</button>

				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					header={{ position: 'sticky' }}
					maxHeight="140px"
					editable={{ rows: editing, onRowsChange: setEditing, onValueChange: () => {} }}
				/>
			</div>
		)
	}

	it('scrolls a clipped validation message into the grid viewport', async () => {
		const { container } = renderUI(<Harness />)

		// Edit the last row, whose cell sits below the 140px scroll window.
		fireEvent.click(screen.getByRole('button', { name: 'edit-last' }))

		const input = container.querySelector('[data-slot="grid-edit-input"]') as HTMLInputElement

		// Trigger the validation error.
		fireEvent.change(input, { target: { value: 'bad' } })

		await waitFor(() => {
			const message = screen.getByRole('alert')

			const scroller = scrollParent(message)

			expect(scroller).not.toBeNull()

			const m = message.getBoundingClientRect()

			const c = (scroller as HTMLElement).getBoundingClientRect()

			// The message is inside the scroll container's box, not clipped past its edge.
			expect(m.bottom).toBeLessThanOrEqual(c.bottom + 1)

			expect(m.top).toBeGreaterThanOrEqual(c.top - 1)
		})
	})
})
