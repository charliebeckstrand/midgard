import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Per-column filter Sheet against the real floating engine. A filterable
 * column's header button opens a right-side modal `Sheet` hosting a single-field
 * `QueryBuilder`; edits stay in a draft until Apply settles them onto the
 * engine. The rule's operator `Select` (and a `date` column's calendar) portal
 * into their own floating-ui portals, outside the sheet's DOM subtree — a press
 * inside one must not register as an outside dismiss, and the surface must layer
 * above the sheet rather than behind its backdrop. The jsdom suite mocks
 * `@floating-ui/react` away (overlays render inline, no real stacking), so only
 * this suite exercises the real overlay/floating interplay.
 */
describe('grid column filter sheet (real browser)', () => {
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

	it('keeps the sheet open when picking from the nested operator select', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		// The sheet is open: its single-column query builder shows "Add rule".
		await screen.findByRole('button', { name: 'Add rule' })

		// The operator listbox teleports to its own floating portal, outside the
		// sheet. Opening it and picking an option must not dismiss the sheet.
		const operator = screen.getByRole('combobox', { name: 'Operator' })

		await userEvent.click(operator)

		await userEvent.click(await screen.findByRole('option', { name: 'starts with' }))

		// The sheet stands, and the pick committed to the draft's operator trigger.
		await waitFor(() => expect(operator).toHaveTextContent('starts with'))

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeInTheDocument()
	})

	it('closes the operator listbox on a press elsewhere in the sheet', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		await screen.findByRole('button', { name: 'Add rule' })

		await userEvent.click(screen.getByRole('combobox', { name: 'Operator' }))

		await screen.findByRole('listbox')

		// Press "Add rule" — inside the sheet, outside the listbox. The open listbox
		// overlays the row, so dispatch the pointerdown the dismiss listens for
		// directly rather than via a click Playwright would block as covered.
		fireEvent.pointerDown(screen.getByRole('button', { name: 'Add rule' }))

		// The listbox dismisses; the sheet stays open.
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeInTheDocument()
	})

	it('traps Tab focus within the open filter sheet', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		const panel = (await screen.findByRole('button', { name: 'Add rule' })).closest(
			'[data-slot="sheet"]',
		)

		if (!panel) throw new Error('no sheet panel')

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

		// Apply settles the draft: only Bob survives, and the sheet closes.
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

/**
 * A `date` column's filter opens a date picker inside the sheet. Its calendar
 * portals out of the sheet, and must layer *above* the sheet's backdrop — the
 * regression was a calendar painting behind the dimming scrim, unreachable.
 */
describe('grid column filter sheet: date picker layering (real browser)', () => {
	type Task = { id: number; due: string }

	const columns: GridColumn<Task>[] = [
		{
			id: 'due',
			title: 'Due',
			cell: (task) => task.due,
			value: (task) => task.due,
			filterable: true,
			filterType: 'date',
		},
	]

	const tasks: Task[] = [{ id: 1, due: '2026-01-10' }]

	it('layers the date picker calendar above the sheet backdrop', async () => {
		renderUI(<Grid columns={columns} rows={tasks} getKey={(task) => task.id} />)

		await userEvent.click(screen.getByRole('button', { name: 'Filter Due' }))

		// Open the date value editor; its calendar teleports to its own portal.
		await userEvent.click(await screen.findByRole('button', { name: 'Due value' }))

		const calendar = await waitFor(() => {
			const node = document.querySelector<HTMLElement>('[data-slot="datepicker-content"]')

			if (!node) throw new Error('calendar not open')

			return node
		})

		// The calendar must be the topmost element at its own centre — not covered by
		// the sheet's backdrop or panel. A behind-the-scrim calendar fails here.
		const rect = calendar.getBoundingClientRect()

		const topmost = document.elementFromPoint(
			rect.left + rect.width / 2,
			rect.top + rect.height / 2,
		)

		expect(topmost && calendar.contains(topmost)).toBeTruthy()
	})
})
