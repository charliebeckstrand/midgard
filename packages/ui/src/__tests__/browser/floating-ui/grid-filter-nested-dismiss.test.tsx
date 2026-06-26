import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI, screen, waitFor } from '../../helpers'

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
})
