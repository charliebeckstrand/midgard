import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../../components/drawer'
import { Input } from '../../../components/input'
import { Sheet, SheetBody, SheetPanel, SheetTitle } from '../../../components/sheet'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI, screen, waitFor, within } from '../../helpers'

/**
 * An overlay moves the focus into its panel without a scroll of the page.
 *
 * On iOS, a focus that can scroll opens the keyboard, and Safari scrolls the
 * page under the overlay to show the field. The body lock does not stop this
 * scroll. The focus of a field with `preventScroll` does not move the page.
 * Chromium and the WebKit of Linux do not show the scroll, so each case reads
 * the options of each call to `focus` on the field.
 *
 * Rides the real floating engine: the jsdom mock of the focus manager moves
 * the focus only to `initialFocus`.
 */

let focus: MockInstance<HTMLElement['focus']>

beforeEach(() => {
	focus = vi.spyOn(HTMLElement.prototype, 'focus')
})

/** The options of each call to `focus` on `element`. */
function focusCalls(element: HTMLElement) {
	return focus.mock.contexts.flatMap((context, index) =>
		context === element ? [focus.mock.calls[index]?.[0]] : [],
	)
}

function expectNoScroll(element: HTMLElement) {
	const calls = focusCalls(element)

	expect(calls.length).toBeGreaterThan(0)

	for (const options of calls) expect(options).toMatchObject({ preventScroll: true })
}

type Row = { id: number; name: string; note: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice', note: 'First' },
	{ id: 2, name: 'Bruno', note: 'Second' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'note', title: 'Note', field: 'note', cell: (row) => row.note },
	{
		id: 'actions',
		actions: (row, { expand }) => (
			<button type="button" onClick={expand}>
				{`expand-${row.id}`}
			</button>
		),
	},
]

describe('overlay initial focus (real floating engine)', () => {
	it('focuses the first field of a drawer without a scroll', async () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel aria-label="Edit">
					<DrawerTitle>Edit</DrawerTitle>
					<DrawerBody>
						<Input aria-label="Name" />
					</DrawerBody>
				</DrawerPanel>
			</Drawer>,
		)

		const field = screen.getByRole('textbox', { name: 'Name' })

		await waitFor(() => expect(field).toHaveFocus())

		expectNoScroll(field)
	})

	it('focuses the first field of a sheet without a scroll', async () => {
		renderUI(
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel aria-label="Edit">
					<SheetTitle>Edit</SheetTitle>
					<SheetBody>
						<Input aria-label="Name" />
					</SheetBody>
				</SheetPanel>
			</Sheet>,
		)

		const field = screen.getByRole('textbox', { name: 'Name' })

		await waitFor(() => expect(field).toHaveFocus())

		expectNoScroll(field)
	})

	it('focuses the first field of a Grid row form without a scroll', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'expand-2' }))

		const sheet = await screen.findByRole('dialog')

		const field = within(sheet).getByRole('textbox', { name: 'Name' })

		await waitFor(() => expect(field).toHaveFocus())

		expectNoScroll(field)
	})

	it('focuses the field of the cursor cell in a Grid row form without a scroll', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		await userEvent.click(within(screen.getByRole('grid')).getByRole('gridcell', { name: 'First' }))

		await userEvent.keyboard('{Shift>}{Enter}{/Shift}')

		const sheet = await screen.findByRole('dialog')

		const field = within(sheet).getByRole('textbox', { name: 'Note' })

		await waitFor(() => expect(field).toHaveFocus())

		expectNoScroll(field)
	})
})
