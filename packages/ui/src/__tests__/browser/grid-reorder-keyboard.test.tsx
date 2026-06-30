import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * A keyboard-activated column reorder must give a visible cue. dnd-kit's keyboard
 * sensor starts the drag on Space/Enter over the grip, but the column does not
 * move until an arrow key — so without a state-driven indicator there is nothing
 * on screen to show it is now held. The held column dims its text to the muted
 * foreground (header and body alike, via the shared reorder-cell class): the
 * header already sits at that shade, so the bright body dims to meet it and the
 * whole column reads as one lifted, muted slice while an idle column stays bright.
 *
 * Real focus, layout, and computed colour, so this runs in the browser suite.
 */
describe('grid column reorder: keyboard lift indicator (real browser)', () => {
	type Row = { id: number; a: string; b: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', cell: (r) => r.a, width: '120px' },
		{ id: 'b', title: 'B', cell: (r) => r.b, width: '120px' },
	]

	const rows: Row[] = [
		{ id: 1, a: 'a1', b: 'b1' },
		{ id: 2, a: 'a2', b: 'b2' },
	]

	function cellFor(tag: 'th' | 'td', id: string): HTMLElement {
		const cell = document.querySelector(`${tag}[data-grid-col="${id}"]`)

		if (!cell) throw new Error(`no ${tag} for column ${id}`)

		return cell as HTMLElement
	}

	it('mutes the held column header and body when a drag starts from the keyboard', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder />)

		const grip = screen.getByRole('button', { name: 'Reorder A' })

		const headerA = cellFor('th', 'a')

		const bodyA = cellFor('td', 'a')

		const bodyB = cellFor('td', 'b')

		// At rest the header is muted (table header base) but the body is the bright
		// default, so the two differ — the baseline the drag collapses.
		const restBodyColor = getComputedStyle(bodyA).color

		expect(getComputedStyle(headerA).color).not.toBe(restBodyColor)

		grip.focus()

		// dnd-kit's keyboard sensor activates on the grip's `code` (Space starts it).
		fireEvent.keyDown(grip, { code: 'Space' })

		await waitFor(() => expect(headerA).toHaveAttribute('data-dragging'))

		const dragBodyColor = getComputedStyle(bodyA).color

		// The held body dims, landing on the muted shade its header already wears —
		// head and body now read as one muted column.
		expect(dragBodyColor).not.toBe(restBodyColor)

		expect(getComputedStyle(headerA).color).toBe(dragBodyColor)

		// An idle neighbour keeps the bright default: the muting tracks the drag, not
		// the whole table.
		expect(getComputedStyle(bodyB).color).toBe(restBodyColor)

		// Drop the drag so the held column doesn't outlive the test.
		fireEvent.keyDown(grip, { code: 'Escape' })
	})
})
