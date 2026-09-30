import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { deferred, renderUI, screen, waitFor } from '../helpers'
import { captureDownload } from '../helpers/capture-download'

/**
 * The Export trigger of the grid toolbar keeps keyboard focus while an async
 * export runs (WCAG 2.4.3). A browser moves focus off a button that turns
 * `disabled`, so the trigger gates activation with `aria-disabled`. Real focus
 * movement needs a browser, so this runs in the browser suite.
 */
describe('grid Export trigger focus (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	it('keeps focus on the trigger while the export runs and after it settles', async () => {
		captureDownload()

		const server = deferred<Row[]>()

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				exportRows={() => server.promise}
			/>,
		)

		const trigger = screen.getByRole('button', { name: 'Export' })

		trigger.focus()

		await userEvent.click(trigger)

		await screen.findByRole('menu')

		await userEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		// The spinner marks the busy state. Focus must stay on the trigger, not
		// fall to `body`.
		await waitFor(() =>
			expect(trigger.querySelector('[data-slot="loading-spinner"]')).not.toBeNull(),
		)

		await waitFor(() => expect(trigger).toHaveFocus())

		expect(trigger).toHaveAttribute('aria-disabled', 'true')

		// Enter on the busy trigger opens no menu.
		await userEvent.keyboard('{Enter}')

		expect(screen.queryByRole('menu')).toBeNull()

		server.resolve(rows)

		await waitFor(() => expect(trigger).not.toHaveAttribute('aria-disabled'))

		expect(trigger).toHaveFocus()
	})
})
