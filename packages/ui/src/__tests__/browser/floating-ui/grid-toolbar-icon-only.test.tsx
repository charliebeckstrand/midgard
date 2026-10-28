import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Grid, type GridColumn, type GridToolbarButton } from '../../../modules/grid'
import { renderUI, screen, waitFor } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * The object form of `toolbar` on the column manager and on export: an
 * icon-only button keeps its label as its accessible name, and `tooltip` shows
 * that label on hover. The tooltip closes when the dialog or the menu of the
 * button opens. A hover tooltip needs real pointer events and real timers, so
 * this runs in the browser suite.
 */
describe('grid icon-only toolbar buttons (real browser)', () => {
	beforeAll(() => page.viewport(1280, 800))

	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	function renderGrid(button: GridToolbarButton) {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				columnManager={{ toolbar: button }}
				exportable={{ types: ['csv'], toolbar: button }}
			/>,
		)

		return {
			manage: screen.getByRole('button', { name: 'Manage columns' }),
			exportTrigger: screen.getByRole('button', { name: 'Export' }),
		}
	}

	it('keeps the label as the name and shows no label text', () => {
		const { manage, exportTrigger } = renderGrid({ iconOnly: true })

		for (const button of [manage, exportTrigger]) {
			// The Button reads the `sr-only` label as no label, so it stays square.
			expect(button).not.toHaveAttribute('data-has-label')

			expect(button.querySelector('.sr-only')).not.toBeNull()
		}
	})

	it('shows the label in a tooltip that the dialog closes', async () => {
		const { manage } = renderGrid({ iconOnly: true, tooltip: true })

		await userEvent.hover(manage)

		expect(await screen.findByRole('tooltip')).toHaveTextContent('Manage columns')

		// The tooltip echoes the name, so it gives no description.
		expect(manage).not.toHaveAttribute('aria-describedby')

		await userEvent.click(manage)

		await screen.findByRole('dialog')

		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('shows the Export label in a tooltip that the menu closes', async () => {
		const { exportTrigger } = renderGrid({ iconOnly: true, tooltip: true })

		await userEvent.hover(exportTrigger)

		expect(await screen.findByRole('tooltip')).toHaveTextContent('Export')

		expect(exportTrigger).not.toHaveAttribute('aria-describedby')

		await userEvent.click(exportTrigger)

		await screen.findByRole('menu')

		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('shows no tooltip on a labeled button', async () => {
		const { manage } = renderGrid({ tooltip: true })

		expect(manage).toHaveAttribute('data-has-label')

		await userEvent.hover(manage)

		// Longer than the open delay of a tooltip, so a tooltip has time to show.
		await pause(400)

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})
})
