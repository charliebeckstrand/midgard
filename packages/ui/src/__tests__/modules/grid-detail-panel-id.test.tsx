import '../setup/grid-modules'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI } from '../helpers'

type Row = { id: string; name: string }

const rows: Row[] = [
	{ id: 'a b', name: 'Alice' },
	{ id: 'c', name: 'Bob' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'expand', expander: true },
	{ id: 'name', title: 'Name', field: 'name' },
]

function ExpandableGrid() {
	return (
		<Grid
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			expandable={{ defaultValue: new Set(['a b']), render: (row) => <p>{row.name}</p> }}
		/>
	)
}

/**
 * The expander's `aria-controls` names the detail panel by its id. The id must
 * be unique in the document, and one token, so the reference resolves.
 */
describe('Grid detail panel id', () => {
	it('gives each grid its own panel ids, and a key with a space one id token', () => {
		const { container } = renderUI(
			<>
				<ExpandableGrid />
				<ExpandableGrid />
			</>,
		)

		const toggles = [...container.querySelectorAll<HTMLElement>('[aria-controls]')]

		const ids = toggles.map((toggle) => toggle.getAttribute('aria-controls') ?? '')

		// Two grids of two rows: four toggles, four distinct ids.
		expect(new Set(ids).size).toBe(4)

		for (const id of ids) expect(id).not.toMatch(/\s/)

		// Each toggle names the panel of its own row, in its own grid.
		const tables = container.querySelectorAll('table')

		expect(tables).toHaveLength(2)

		for (const table of tables) {
			for (const row of rows) {
				const toggle = present(
					table.querySelector(`[aria-label="Details for row ${row.id}"]`),
					`the toggle of row ${row.id}`,
				)

				const panel = present(
					table.querySelector(`tr[data-detail-row="${row.id}"] section`),
					`the panel of row ${row.id}`,
				)

				expect(document.getElementById(toggle.getAttribute('aria-controls') ?? '')).toBe(panel)
			}
		}
	})
})
