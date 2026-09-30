import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * An open editor sits inside the truncation span of its cell. That span clips
 * its overflow, so it is a scroll container. The validation message shows
 * below the cell, and its scroll into view scrolled the span: the editor moved
 * up and its top clipped. The span lets its content overflow while it holds an
 * editor. Real browser, because the clip and the scroll need a layout engine.
 */
describe('grid edit validation overflow (real browser)', () => {
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

	const rows: Row[] = Array.from({ length: 3 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	function Harness() {
		const [editing, setEditing] = useState<Set<string | number>>(new Set())

		return (
			<div style={{ width: '320px' }}>
				<button type="button" onClick={() => setEditing(new Set([1]))}>
					edit-first
				</button>

				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ rows: editing, onRowsChange: setEditing, onCommit: () => {} }}
				/>
			</div>
		)
	}

	it('keeps the editor in place and shows the message, with the default truncate', async () => {
		const { container } = renderUI(<Harness />)

		fireEvent.click(screen.getByRole('button', { name: 'edit-first' }))

		const input = await waitFor(() =>
			present<HTMLInputElement>(
				container.querySelector('[data-slot="grid-edit-input"]'),
				'the edit input',
			),
		)

		const span = present(
			input.closest<HTMLElement>('[data-grid-content]'),
			'the truncation span of the edited cell',
		)

		const top = input.getBoundingClientRect().top

		fireEvent.change(input, { target: { value: 'bad' } })

		const message = await screen.findByRole('alert')

		await waitFor(() => {
			// The scroll into view did not scroll the span, so the editor holds its place.
			expect(span.scrollTop).toBe(0)

			expect(input.getBoundingClientRect().top).toBeNear(top, HALF_PIXEL)

			// No ancestor clips the message: the point at its center hits it.
			const box = message.getBoundingClientRect()

			expect(box.height).toBeGreaterThan(0)

			const { x, y } = centerOf(message)

			const hit = document.elementFromPoint(x, y)

			expect(hit && message.contains(hit)).toBe(true)
		})
	})
})
