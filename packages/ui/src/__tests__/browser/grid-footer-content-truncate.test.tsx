import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, renderUI, screen, waitFor } from '../helpers'

/**
 * The footer's trailing slot shrinks past its content, so custom
 * {@link GridFooter.content} that opts into `truncate` clips against the bar
 * instead of running out of it (`k.summary.trailing` carries why).
 *
 * Only real layout can see this: jsdom reports `scrollWidth`/`clientWidth` as 0
 * and resolves no flex sizing, so the component suite can assert the classes and
 * nothing more. The reveal half is `floating-ui/grid-footer-truncate-tooltip`.
 */
describe('grid footer trailing content truncates (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	const rows: Row[] = [{ id: 1, name: 'Name 1' }]

	const LONG =
		'Carrier is one of ACME Freight Systems, Blue Ridge Logistics, Continental Cartage Group, Delta Overland Express and 14 more'

	it('clips an over-wide label to an ellipsis, keeping the figure beside it', async () => {
		const { container } = renderFooter(LONG)

		const label = screen.getByTestId('label')

		// Polled rather than read once: a late font settle re-measures the text.
		await waitFor(() => expect(label.scrollWidth).toBeGreaterThan(label.clientWidth))

		// The label gave up the width, not the figure: the whole bar stays inside the
		// grid rather than overflowing it, and the pinned text keeps its full extent.
		const bar = bySlot(container, 'grid-footer') as HTMLElement

		expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth + 1)

		const figure = screen.getByText('· $1,284,900 total spend')

		expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth + 1)
	})

	it('leaves a label that fits at its natural width', () => {
		renderFooter('Carrier is ACME')

		const label = screen.getByTestId('label')

		expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1)
	})

	/**
	 * A narrow grid whose footer carries a truncating label beside a pinned figure —
	 * the shipments drill's reconciliation line, whose label is server-composed from
	 * the drilled selection and so has no bound.
	 */
	function renderFooter(label: string) {
		return renderUI(
			<div style={{ width: '360px' }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					footer={{
						rowTotal: true,
						content: () => (
							<span className="flex min-w-0 items-center gap-1">
								<span data-testid="label" className="block truncate">
									{label}
								</span>
								<span className="shrink-0 whitespace-nowrap">· $1,284,900 total spend</span>
							</span>
						),
					}}
				/>
			</div>,
		)
	}
})
