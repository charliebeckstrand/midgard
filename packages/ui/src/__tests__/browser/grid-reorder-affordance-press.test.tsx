import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'
import { drag } from './helpers/drag'

/**
 * A handle-less header (`reorder={{ handle: false }}`) *is* its own drag
 * activator, so every control inside it sits on the drag target. Pressing one and
 * drifting a few pixels past the sensor's activation distance used to lift the
 * column — and then the surface that control opened took the `pointerup` with it,
 * leaving the column held while the pointer moved on toward the sheet. The user
 * saw columns reordering under a pointer that was only traveling to the filter
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

	/** Press `from` and drift 60px right — well past the sensor's 3px activation distance. */
	function pressAndDrift(from: HTMLElement) {
		const box = from.getBoundingClientRect()

		const y = box.y + 4

		return drag(from, { x: box.x + 4, y }, [
			{ x: box.x + 20, y },
			{ x: box.x + 60, y },
		])
	}

	it('does not lift the column when the filter button is pressed and drifts', async () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder={{ handle: false }} />,
		)

		const trigger = screen.getByRole('button', { name: 'Filter A' })

		const held = await pressAndDrift(trigger)

		expect(header('a')).not.toHaveAttribute('data-dragging')

		await held.release()
	})

	// The other half: the guard must cost the header nothing. The cell itself opens
	// no surface, so it stays the grab handle the whole-header policy relies on.
	it('still lifts the column when the header cell itself is pressed and drifts', async () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder={{ handle: false }} />,
		)

		const cell = header('a')

		const held = await pressAndDrift(cell)

		expect(cell).toHaveAttribute('data-dragging')

		await held.release()
	})
})
