import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * A keyboard-activated column reorder must give a visible "lifted" cue. dnd-kit's
 * keyboard sensor starts the drag on Space/Enter over the grip, but the column
 * does not move until an arrow key — so without a state-driven indicator there is
 * nothing on screen to show it is now held (the lift's shadow sits over a fill
 * that matches the surface, so it barely reads). The dragged header takes the
 * library's lifted ring — an inset ring keyed on `data-dragging`, as a
 * keyboard-lifted List or Kanban card wears — while an idle header shows none.
 *
 * The ring resolves to an `inset` box-shadow that the lift's outset `shadow-lg`
 * never produces, so its presence is the precise signal here. Real focus, layout,
 * and computed colour, so this runs in the browser suite.
 */
describe('grid column reorder — keyboard lift indicator (real browser)', () => {
	type Row = { id: number; a: string; b: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', cell: (r) => r.a, width: '120px' },
		{ id: 'b', title: 'B', cell: (r) => r.b, width: '120px' },
	]

	const rows: Row[] = [
		{ id: 1, a: 'a1', b: 'b1' },
		{ id: 2, a: 'a2', b: 'b2' },
	]

	function headerFor(id: string): HTMLElement {
		const header = document.querySelector(`th[data-grid-col="${id}"]`)

		if (!header) throw new Error(`no reorderable header for column ${id}`)

		return header as HTMLElement
	}

	it('rings the dragged column header when a drag starts from the keyboard', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder />)

		const grip = screen.getByRole('button', { name: 'Reorder A' })

		const headerA = headerFor('a')

		const headerB = headerFor('b')

		// At rest no column is held, so no header wears the inset lifted ring.
		expect(getComputedStyle(headerA).boxShadow).not.toContain('inset')

		grip.focus()

		// dnd-kit's keyboard sensor activates on the grip's `code` (Space starts it).
		fireEvent.keyDown(grip, { code: 'Space' })

		await waitFor(() => expect(headerA).toHaveAttribute('data-dragging'))

		// The held column's header now carries the inset lifted ring; its idle
		// neighbour does not — the ring tracks the drag, not the reorderable set.
		expect(getComputedStyle(headerA).boxShadow).toContain('inset')

		expect(getComputedStyle(headerB).boxShadow).not.toContain('inset')

		// Drop the drag so the lifted column doesn't outlive the test.
		fireEvent.keyDown(grip, { code: 'Escape' })
	})
})
