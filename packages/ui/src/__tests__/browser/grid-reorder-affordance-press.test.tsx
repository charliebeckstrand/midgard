import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

/**
 * A handle-less header (`reorder={{ handle: false }}`) *is* its own drag
 * activator, so every control inside it sits on the drag target. Pressing one and
 * drifting a few pixels past the sensor's activation distance used to lift the
 * column — and then the surface that control opened took the `pointerup` with it,
 * leaving the column held while the pointer moved on toward the sheet. The user
 * saw columns reordering under a pointer that was only travelling to the filter
 * they had just opened.
 *
 * Real pointer geometry against the real floating engine, so this lives in the
 * browser suite: under jsdom the overlay mock renders the sheet inline, which
 * changes the very DOM relationship under test.
 */
describe('grid column reorder: pressing a header affordance (real browser)', () => {
	type Row = { id: number; a: string; b: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'a',
			title: 'A',
			sortable: true,
			filterable: true,
			cell: (r) => r.a,
			value: (r) => r.a,
			width: '140px',
		},
		{ id: 'b', title: 'B', sortable: true, cell: (r) => r.b, width: '140px' },
	]

	const rows: Row[] = [
		{ id: 1, a: 'a1', b: 'b1' },
		{ id: 2, a: 'a2', b: 'b2' },
	]

	function header(id: string): HTMLElement {
		const cell = document.querySelector(`th[data-grid-col="${id}"]`)

		if (!cell) throw new Error(`no th for column ${id}`)

		return cell as HTMLElement
	}

	const raf = () =>
		new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())))

	/** Press `from` and drift 60px right — well past the sensor's 3px activation distance. */
	async function pressAndDrift(from: HTMLElement) {
		const box = from.getBoundingClientRect()

		fireEvent.pointerDown(from, {
			isPrimary: true,
			button: 0,
			clientX: box.x + 4,
			clientY: box.y + 4,
		})

		fireEvent.pointerMove(from, { clientX: box.x + 20, clientY: box.y + 4 })

		await raf()

		fireEvent.pointerMove(from, { clientX: box.x + 60, clientY: box.y + 4 })

		await raf()
	}

	it('does not lift the column when the filter button is pressed and drifts', async () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder={{ handle: false }} />,
		)

		const trigger = screen.getByRole('button', { name: 'Filter A' })

		await pressAndDrift(trigger)

		expect(header('a')).not.toHaveAttribute('data-dragging')

		fireEvent.pointerUp(trigger)
	})

	// The other half: the guard must cost the header nothing. The cell itself opens
	// no surface, so it stays the grab handle the whole-header policy relies on.
	it('still lifts the column when the header cell itself is pressed and drifts', async () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder={{ handle: false }} />,
		)

		const cell = header('a')

		await pressAndDrift(cell)

		expect(cell).toHaveAttribute('data-dragging')

		fireEvent.pointerUp(cell)
	})
})
