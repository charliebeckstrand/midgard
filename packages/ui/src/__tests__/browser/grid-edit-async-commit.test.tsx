import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, present, renderUI } from '../helpers'

/**
 * The pending state of an async commit, as the user sees it. jsdom reads the
 * class list and `aria-busy`, but it computes no style. So only a real
 * browser proves that the pending cell pulses and keeps its value readable.
 */
describe('grid async commit (real browser)', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (r) => r.name },
	]

	it('pulses a pending cell and shows the committed value until the promise settles', async () => {
		let settle: () => void = () => {}

		const onCommit = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					settle = resolve
				}),
		)

		const view = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(r) => r.id}
				editable={{ session: 'managed', scope: 'cell', onCommit }}
			/>,
		)

		const cell = present(view.container.querySelector('td[data-grid-col="name"]'), 'the name cell')

		await userEvent.dblClick(cell)

		await userEvent.keyboard('{Control>}a{/Control}Alicia{F2}')

		expect(onCommit).toHaveBeenCalledOnce()

		const pending = present(bySlot(cell, 'grid-edit-pending'), 'the pending content')

		expect(cell).toHaveAttribute('aria-busy', 'true')

		expect(pending).toHaveTextContent('Alicia')

		expect(pending).toBeVisible()

		// The pulse is the kata's `animate-pulse`, behind `motion-safe`.
		expect(getComputedStyle(pending).animationName).toBe('pulse')

		settle()

		await expect.poll(() => cell.getAttribute('aria-busy')).toBeNull()

		expect(bySlot(cell, 'grid-edit-pending')).toBeNull()
	})
})
