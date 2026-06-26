import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Nested-overlay outside-press (real floating engine). A filterable column's
 * header filter button opens a `Popover` hosting a single-field `QueryBuilder`;
 * the rule's operator `Select` portals its listbox into its own floating-ui
 * portal, outside the popover's DOM subtree. A press inside that listbox must
 * not register as an outside press on the popover and tear it down. The jsdom
 * suite mocks `@floating-ui/react` away (the custom outside-press listener
 * no-ops), so only this suite exercises the predicate in
 * {@link useFloatingDisclosure}.
 */
describe('nested overlay dismiss (real browser) — grid column filter popover', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			filterable: true,
		},
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
	]

	it('keeps the popover open when picking from the nested operator select', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		// The popover is open: its single-column query builder shows "Add rule".
		await screen.findByRole('button', { name: 'Add rule' })

		// The operator listbox teleports to its own floating portal. Opening it and
		// picking an option is the press that previously dismissed the popover.
		const operator = screen.getByRole('combobox', { name: 'Operator' })

		await userEvent.click(operator)

		await userEvent.click(await screen.findByRole('option', { name: 'starts with' }))

		// The popover stands, and the pick committed to the operator trigger — the
		// controlled query flows back through the memoized header (the second half
		// of the fix), so the field is live, not frozen on its seed.
		await waitFor(() => expect(operator).toHaveTextContent('starts with'))

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeInTheDocument()
	})

	it('closes the operator listbox on a press elsewhere in the popover', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		await screen.findByRole('button', { name: 'Add rule' })

		await userEvent.click(screen.getByRole('combobox', { name: 'Operator' }))

		await screen.findByRole('listbox')

		// Press "Add rule" — in the popover (the listbox's ancestor portal, which
		// hosts the listbox's own trigger), outside the listbox itself. The open
		// listbox overlays the row, so dispatch the pointerdown the dismiss listens
		// for directly rather than via a click Playwright would block as covered.
		fireEvent.pointerDown(screen.getByRole('button', { name: 'Add rule' }))

		// The listbox dismisses; the popover stays open.
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeInTheDocument()
	})

	it('traps Tab focus within the open filter popover', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		const panel = (await screen.findByRole('button', { name: 'Add rule' })).closest(
			'[data-slot="popover-content"]',
		)

		if (!panel) throw new Error('no popover content')

		// Cycle past every control; the modal focus manager keeps focus inside.
		for (let i = 0; i < 6; i++) {
			await userEvent.tab()

			expect(panel.contains(document.activeElement)).toBe(true)
		}
	})
})
