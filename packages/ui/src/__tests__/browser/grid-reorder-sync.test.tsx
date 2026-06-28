import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

/**
 * During a column-reorder drag the body cells shift via a CSS variable their
 * header writes, rather than each registering its own sortable. The header reads
 * that same variable, so a column's header and its body cells must resolve to the
 * identical transform at every moment of the drag — otherwise the header and body
 * drift out of phase through the shift transition (a regression that shipped when
 * the header still applied dnd-kit's transform inline while the body read the
 * variable). Real pointer geometry past the activation distance, so this runs in
 * the browser suite.
 */
describe('grid column reorder — header/body shift stay in phase (real browser)', () => {
	type Row = { id: number; a: string; b: string; c: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', cell: (r) => r.a, width: '120px' },
		{ id: 'b', title: 'B', cell: (r) => r.b, width: '120px' },
		{ id: 'c', title: 'C', cell: (r) => r.c, width: '120px' },
	]

	const rows: Row[] = [
		{ id: 1, a: 'a1', b: 'b1', c: 'c1' },
		{ id: 2, a: 'a2', b: 'b2', c: 'c2' },
	]

	const raf = () =>
		new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())))

	function columnTransform(id: string) {
		const head = document.querySelector(`th[data-grid-col="${id}"]`)
		const body = document.querySelector(`td[data-grid-col="${id}"]`)

		return {
			head: head ? getComputedStyle(head).transform : 'no-head',
			body: body ? getComputedStyle(body).transform : 'no-body',
		}
	}

	it('keeps each column header and its body cells on the same transform mid-drag', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder />)

		const grip = screen.getByRole('button', { name: 'Reorder A' })

		fireEvent.pointerDown(grip, { isPrimary: true, button: 0, clientX: 60, clientY: 10 })

		fireEvent.pointerMove(grip, { clientX: 75, clientY: 10 })

		await raf()

		// Drag A past B's midpoint so B shifts and a transition is in flight.
		fireEvent.pointerMove(grip, { clientX: 230, clientY: 10 })

		await raf()

		for (const id of ['a', 'b', 'c']) {
			const { head, body } = columnTransform(id)

			expect(body, `column ${id}: body transform must match its header`).toBe(head)
		}

		// The dragged column A follows the pointer, so its transform is non-identity
		// — proof the equality checks above aren't a vacuous both-untransformed pass.
		expect(columnTransform('a').head).not.toBe('matrix(1, 0, 0, 1, 0, 0)')

		fireEvent.pointerUp(grip, { clientX: 230, clientY: 10 })
	})
})
