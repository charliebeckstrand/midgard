import { describe, expect, it } from 'vitest'
import { Grid } from '../../../modules/grid'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Column-header truncation reveal against real layout. A truncated title exposes
 * its full text through the native `title` attribute — no floating-ui portal per
 * header; jsdom can't measure overflow (`scrollWidth`/`clientWidth` are 0), so it
 * only resolves in the browser. A narrow controlled width forces truncation.
 * Both the sortable path (title inside the sort button) and the plain path run.
 */
describe('grid header truncation reveal (real browser)', () => {
	type Row = { id: number; name: string }

	const longTitle = 'A very long column title that overflows its narrow header'

	const rows: Row[] = [{ id: 1, name: 'Ada' }]

	const getKey = (row: Row) => row.id

	const narrow = { value: { name: 80 } }

	it('reveals the full title via the native title when a sortable header is truncated', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: longTitle, cell: (row) => row.name }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await waitFor(() => expect(screen.getByText(longTitle)).toHaveAttribute('title', longTitle))
	})

	it('reveals the full title when a non-sortable header is truncated', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: longTitle, sortable: false, cell: (row) => row.name }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await waitFor(() => expect(screen.getByText(longTitle)).toHaveAttribute('title', longTitle))
	})

	it('reveals nothing when the title fits the header (precise detection)', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: 'Name', cell: (row) => row.name }]}
				columnSizing={{ value: { name: 360 } }}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await screen.findByText('Name')

		// A short title in a wide header does not overflow (guards a sub-pixel false positive).
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.getByText('Name')).not.toHaveAttribute('title')
	})
})
