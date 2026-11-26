import '../setup/grid-modules'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'
import { hydrateServerRender } from '../helpers/hydrate'

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
				expect(table.querySelector(`[aria-label="Details for row ${row.id}"]`)).toControl(
					table.querySelector(`tr[data-detail-row="${row.id}"] section`),
				)
			}
		}
	})

	/** The id that each expander names, in the order of the rows, under `root`. */
	function controls(root: ParentNode) {
		return rows.map((row) =>
			root.querySelector(`[aria-label="Details for row ${row.id}"]`)?.getAttribute('aria-controls'),
		)
	}

	// A closed panel rests in a hidden Activity, which the server does not render.
	it('names no closed panel in the server markup', () => {
		const html = renderToString(<ExpandableGrid />)

		const template = document.createElement('template')

		template.innerHTML = html

		const [open, closed] = controls(template.content)

		expect(open).toBeTruthy()

		expect(template.content.getElementById(open ?? '')).not.toBeNull()

		expect(closed).toBeNull()
	})

	it('names the closed panel after hydration, with no mismatch', () => {
		const { container, onRecoverableError } = hydrateServerRender(<ExpandableGrid />)

		expect(onRecoverableError).not.toHaveBeenCalled()

		const table = container.querySelector('table')

		for (const row of rows) {
			expect(table?.querySelector(`[aria-label="Details for row ${row.id}"]`)).toControl(
				table?.querySelector(`tr[data-detail-row="${row.id}"] section`),
			)
		}
	})
})
