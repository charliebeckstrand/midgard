import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

type Row = { id: string; name: string }

const rows: Row[] = Array.from({ length: 20 }, (_, i) => ({ id: `r ${i}`, name: `Name ${i}` }))

const columns: GridColumn<Row>[] = [
	{ id: 'expand', expander: true },
	{ id: 'name', title: 'Name', field: 'name' },
]

/**
 * A windowed master-detail body mounts a panel only while it is open. The
 * expander of a collapsed row therefore names no panel, and an open row names
 * the panel that is there.
 */
describe('Grid detail panel id in a windowed body (real browser)', () => {
	it('names the mounted panel of an open row, and no panel of a collapsed row', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				expandable={{ defaultValue: new Set(['r 0']), render: (row) => <p>{row.name}</p> }}
				virtualize
				maxHeight="300px"
			/>,
		)

		const toggle = (label: string) =>
			container.querySelector<HTMLElement>(`[aria-label="${label}"]`)

		await waitFor(() => expect(toggle('Collapse details for row r 0')).not.toBeNull())

		const open = toggle('Collapse details for row r 0')

		const closed = toggle('Expand details for row r 1')

		expect(document.getElementById(open?.getAttribute('aria-controls') ?? '')).not.toBeNull()

		expect(closed?.hasAttribute('aria-controls')).toBe(false)
	})
})
