import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Per-column filter Drawer against the real floating engine. A filterable
 * column's header button opens a modal `Drawer` hosting a single-field
 * `QueryBuilder`; edits stay in a draft until Apply settles them onto the
 * engine. The rule's operator `Select` portals its listbox into its own
 * floating-ui portal, outside the drawer's DOM subtree — a press inside that
 * listbox must not register as an outside dismiss on the drawer. The jsdom suite
 * mocks `@floating-ui/react` away (overlays render inline, the dismiss listener
 * no-ops), so only this suite exercises the real overlay/listbox interplay.
 */
describe('grid column filter drawer (real browser)', () => {
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

	const getKey = (row: Row) => row.id

	it('keeps the drawer open when picking from the nested operator select', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		// The drawer is open: its single-column query builder shows "Add rule".
		await screen.findByRole('button', { name: 'Add rule' })

		// The operator listbox teleports to its own floating portal, outside the
		// drawer. Opening it and picking an option must not dismiss the drawer.
		const operator = screen.getByRole('combobox', { name: 'Operator' })

		await userEvent.click(operator)

		await userEvent.click(await screen.findByRole('option', { name: 'starts with' }))

		// The drawer stands, and the pick committed to the draft's operator trigger.
		await waitFor(() => expect(operator).toHaveTextContent('starts with'))

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeInTheDocument()
	})

	it('closes the operator listbox on a press elsewhere in the drawer', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		await screen.findByRole('button', { name: 'Add rule' })

		await userEvent.click(screen.getByRole('combobox', { name: 'Operator' }))

		await screen.findByRole('listbox')

		// Press "Add rule" — inside the drawer, outside the listbox. The open listbox
		// overlays the row, so dispatch the pointerdown the dismiss listens for
		// directly rather than via a click Playwright would block as covered.
		fireEvent.pointerDown(screen.getByRole('button', { name: 'Add rule' }))

		// The listbox dismisses; the drawer stays open.
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeInTheDocument()
	})

	it('traps Tab focus within the open filter drawer', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		const panel = (await screen.findByRole('button', { name: 'Add rule' })).closest(
			'[data-slot="drawer"]',
		)

		if (!panel) throw new Error('no drawer panel')

		// Cycle past every control; the modal focus manager keeps focus inside.
		for (let i = 0; i < 6; i++) {
			await userEvent.tab()

			expect(panel.contains(document.activeElement)).toBe(true)
		}
	})

	it('settles the filter only on Apply', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		await userEvent.type(screen.getByRole('textbox', { name: 'Name value' }), 'Bob')

		// While the draft is open and unapplied, the rows are untouched.
		expect(screen.getByText('Alice')).toBeInTheDocument()

		await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

		// Apply settles the draft: only Bob survives, and the drawer closes.
		await waitFor(() => expect(screen.queryByText('Alice')).toBeNull())

		expect(screen.getByText('Bob')).toBeInTheDocument()
	})

	it('discards a cancelled draft, leaving the rows unfiltered', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		await userEvent.type(screen.getByRole('textbox', { name: 'Name value' }), 'Bob')

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

		// Nothing was applied: both rows remain, and the button stays unaccented.
		expect(screen.getByText('Alice')).toBeInTheDocument()

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveAttribute('data-active')
	})
})
