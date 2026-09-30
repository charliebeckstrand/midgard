import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, renderUI, screen } from '../helpers'

/**
 * The focus of a keyboard entry into a cell-scoped session. The focus of the
 * editor is the first contact of the cell, and it arms the truncation reveal.
 * The editor then measures clipped when the fill handle of a range sits past
 * the box of the cell content, or when a narrow column clips the editor. The
 * reveal must not reparent the focused editor. jsdom has no layout, so the
 * content never measures clipped there.
 */
describe('grid keyboard entry focus (real browser)', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
	]

	function renderGrid({ range, width }: { range: boolean; width?: number }) {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', field: 'name', width, cell: (r) => r.name },
		]

		const view = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(r) => r.id}
				range={range}
				editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
			/>,
		)

		// A focus call seats the cursor on the first cell with no pointer contact.
		screen.getByRole('grid').focus()

		return view
	}

	it.each([
		['Enter', '{Enter}'],
		['a typed character', 'x'],
	])('focuses the editor on %s with a range', async (_, key) => {
		const view = renderGrid({ range: true })

		await userEvent.keyboard(key)

		expect(bySlot(view.container, 'grid-edit-input')).toHaveFocus()
	})

	it.each([
		['Enter', '{Enter}'],
		['a typed character', 'x'],
	])('focuses the editor on %s in a column that clips it', async (_, key) => {
		const view = renderGrid({ range: false, width: 40 })

		await userEvent.keyboard(key)

		expect(bySlot(view.container, 'grid-edit-input')).toHaveFocus()
	})
})
