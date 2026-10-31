import { useState } from 'react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI, screen, stubMatchMedia, waitFor } from '../../helpers'

type Row = { id: number; name: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{
		id: 'actions',
		actions: (row, { editing }) =>
			editing ? <span>{`check-${row.id}`}</span> : <span>{`pencil-${row.id}`}</span>,
	},
]

function PhoneGrid() {
	const [editing, setEditing] = useState<Set<string | number>>(new Set())

	return (
		<>
			<button type="button" onClick={() => setEditing(new Set([1]))}>
				edit-1
			</button>
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ rows: editing, onRowsChange: setEditing, onCommit: () => {} }}
			/>
		</>
	)
}

/**
 * On a phone, the row actions show the row as in edit only when the drawer has
 * finished its slide in. The drawer reports that through `onOpenComplete`, and
 * no timer gives the moment.
 *
 * Real Motion is necessary: the instant mock never lands an arrival, so the
 * flag would never change.
 */
describe('grid edit drawer arrival (real Motion)', () => {
	it('keeps the pencil while the drawer slides in, and shows the check when it lands', async () => {
		stubMatchMedia((query) => query.startsWith('(hover: none)'))

		renderUI(<PhoneGrid />)

		// The actions at the commit that mounts the drawer. A slow runner can
		// return from the click after the slide lands, so a read after the click
		// does not see that commit.
		let atMount: { pencil: boolean; check: boolean } | null = null

		const observer = new MutationObserver(() => {
			if (atMount !== null || !document.querySelector('[role="dialog"]')) return

			atMount = {
				pencil: screen.queryByText('pencil-1') !== null,
				check: screen.queryByText('check-1') !== null,
			}
		})

		observer.observe(document.body, { childList: true, subtree: true })

		onTestFinished(() => observer.disconnect())

		await userEvent.click(screen.getByRole('button', { name: 'edit-1' }))

		const panel = await screen.findByRole('dialog', { name: 'Edit row 1' })

		// The commit that opens the drawer still shows the pencil.
		expect(atMount).toEqual({ pencil: true, check: false })

		await waitFor(() => expect(screen.queryByText('check-1')).not.toBeNull())

		// The check comes only once the slide is at rest.
		expect(getComputedStyle(panel).transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
	})
})
