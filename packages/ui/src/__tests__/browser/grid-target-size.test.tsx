import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

/**
 * Target size (WCAG 2.5.8): the pinned-column unpin button and the reorder grip
 * render a 20px glyph, under the 24x24 minimum. A centered transparent `::before`
 * expands the *hit* area without moving the glyph. Verified in a real browser
 * (the pseudo-element's hit area needs a layout engine) by probing points just
 * outside the glyph box — top, bottom, and right; the left edge sits flush to the
 * table's scroll boundary, with no adjacent target — and confirming the control is
 * still the element under the pointer there.
 */
describe('grid target size (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'city', title: 'City', cell: (row) => row.id },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
	]

	const getKey = (row: Row) => row.id

	/** Whether the control's hit area reaches 2px past its glyph box on the three open sides. */
	const expandsHitArea = (el: HTMLElement) => {
		const r = el.getBoundingClientRect()

		const cx = r.left + r.width / 2

		const cy = r.top + r.height / 2

		const hits = (x: number, y: number) => {
			const at = document.elementFromPoint(x, y)

			return at === el || el.contains(at)
		}

		return hits(cx, r.top - 2) && hits(cx, r.bottom + 2) && hits(r.right + 2, cy)
	}

	it('expands the pinned unpin button hit area beyond its glyph', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid columns={columns} rows={rows} getKey={getKey} />
			</div>,
		)

		const button = await screen.findByRole('button', { name: 'Unpin Name' })

		expect(expandsHitArea(button)).toBe(true)
	})

	it('expands the reorder grip hit area beyond its glyph', async () => {
		// Reorder chrome needs at least two draggable columns, so add a third.
		const reorderColumns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{ id: 'city', title: 'City', cell: (row) => row.id },
			{ id: 'code', title: 'Code', cell: (row) => row.id },
		]

		renderUI(
			<div style={{ width: '480px' }}>
				<Grid reorder columns={reorderColumns} rows={rows} getKey={getKey} />
			</div>,
		)

		const grip = await screen.findByRole('button', { name: 'Reorder City' })

		expect(expandsHitArea(grip)).toBe(true)
	})
})
