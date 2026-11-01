import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

/**
 * The scroll box of the grid contains each absolute box in its cells (real
 * layout). The header of an actions column has no visible title, so it holds
 * an `sr-only` label, which is an absolute box. The header cell is static, so
 * the label used the grid root as its containing block. The scroll did not
 * clip the label, and at the far end of a wide table the label made the box
 * around the grid scroll too. On a phone, the docs example card then scrolled
 * past the grid. jsdom does no layout, so only a real browser shows it.
 */
describe('grid scroll contains cell labels (real browser)', () => {
	type Row = { id: number; name: string; email: string; role: string; team: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'email', title: 'Email', cell: (row) => row.email },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
		{ id: 'team', title: 'Team', cell: (row) => row.team },
		{ id: 'actions', actions: () => <button type="button">Edit</button> },
	]

	const rows: Row[] = Array.from({ length: 3 }, (_, index) => ({
		id: index + 1,
		name: `Person ${index + 1}`,
		email: `person${index + 1}@example.com`,
		role: 'Developer',
		team: 'Platform',
	}))

	it('does not let the label of an actions header widen the box around the grid', () => {
		const { container } = renderUI(
			<div data-testid="frame" style={{ width: 240, overflow: 'auto' }}>
				<Grid columns={columns} rows={rows} getKey={(row) => row.id} />
			</div>,
		)

		const frame = container.querySelector<HTMLElement>('[data-testid=frame]')

		const scroll = container.querySelector<HTMLElement>('[data-slot=table]')

		if (!frame || !scroll) throw new Error('no frame or grid scroll box')

		// The table is wider than the frame, so the grid scrolls.
		expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth)

		// The frame does not scroll, because the grid holds all of its content.
		expect(frame.scrollWidth).toBe(frame.clientWidth)
	})
})
