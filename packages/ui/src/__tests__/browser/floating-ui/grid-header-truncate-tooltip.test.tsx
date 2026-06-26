import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid } from '../../../modules/grid'
import { renderUI, screen } from '../../helpers'

/**
 * Column-header truncation tooltip against the real floating engine and real
 * layout. The jsdom suite can't see overflow (`scrollWidth`/`clientWidth` are 0)
 * and mocks `@floating-ui/react`, so the hover tooltip only surfaces here. A
 * narrow controlled column width forces the header to truncate (auto-fit stands
 * down while `columnSizing` is controlled). Both the sortable path (title inside
 * the sort button) and the plain path are exercised.
 */
describe('grid header truncation tooltip (real browser)', () => {
	type Row = { id: number; name: string }

	const longTitle = 'A very long column title that overflows its narrow header'

	const rows: Row[] = [{ id: 1, name: 'Ada' }]

	const getKey = (row: Row) => row.id

	const narrow = { value: { name: 80 } }

	it('shows a tooltip with the full title when a sortable header is truncated', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: longTitle, cell: (row) => row.name }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText(longTitle))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(longTitle)
	})

	it('shows a tooltip with the full title when a non-sortable header is truncated', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: longTitle, sortable: false, cell: (row) => row.name }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText(longTitle))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(longTitle)
	})

	it('shows no tooltip when the title fits the header (precise detection)', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: 'Name', cell: (row) => row.name }]}
				columnSizing={{ value: { name: 360 } }}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText('Name'))

		// A short title in a wide header does not overflow; no tooltip should open
		// even after the hover delay (guards against a sub-pixel false positive).
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.queryByRole('tooltip')).toBeNull()
	})
})
