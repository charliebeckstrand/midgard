import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { CurrencyInput } from '../../components/currency-input'
import { DatePicker } from '../../components/date-picker'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Grid, type GridColumn } from '../../modules/grid'
import { getSlot, present, renderUI, screen, waitFor } from '../helpers'

/**
 * The editor slot stretches the editor to the width of its cell. An `editCell`
 * control that sets no width fills the cell, as an inferred editor does. The
 * settle pair and the validation message keep their own widths, below the
 * cell. Real browser, because the widths need a layout engine.
 */
describe('grid editor width (real browser)', () => {
	type Row = { id: number; name: string; role: string; due: string; budget: number }

	const rows: Row[] = [{ id: 1, name: 'Wade', role: 'dev', due: '2026-01-15', budget: 1200 }]

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			field: 'name',
			width: '320px',
			cell: (row) => row.name,
			validate: (value) => (value === 'bad' ? 'Bad' : null),
		},
		{
			id: 'role',
			title: 'Role',
			field: 'role',
			width: '320px',
			cell: (row) => row.role,
			// The listbox renders a `display: contents` wrapper around its trigger.
			editCell: (ctx) => (
				<Listbox<string>
					aria-label={ctx.ariaLabel}
					value={String(ctx.value)}
					onValueChange={(next) => ctx.onValueUpdate(next ?? '')}
				>
					<ListboxOption value="dev">
						<ListboxLabel>Developer</ListboxLabel>
					</ListboxOption>
				</Listbox>
			),
		},
		{
			id: 'due',
			title: 'Due',
			field: 'due',
			width: '320px',
			cell: (row) => row.due,
			// The date picker renders a `display: contents` wrapper around its control.
			editCell: (ctx) => <DatePicker input format="YYYY-MM-DD" aria-label={ctx.ariaLabel} />,
		},
		{
			id: 'budget',
			title: 'Budget',
			field: 'budget',
			width: '320px',
			cell: (row) => String(row.budget),
			editCell: (ctx) => (
				<CurrencyInput
					aria-label={ctx.ariaLabel}
					value={typeof ctx.value === 'number' ? ctx.value : null}
					onValueChange={(next) => ctx.onValueUpdate(next ?? undefined)}
				/>
			),
		},
	]

	/** The first box that the slot holds, through any `display: contents` wrapper. */
	const editorBox = (slot: HTMLElement): HTMLElement => {
		let node = present<HTMLElement>(slot.firstElementChild, 'the editor in the slot')

		while (getComputedStyle(node).display === 'contents') {
			node = present<HTMLElement>(node.firstElementChild, 'the box in the contents wrapper')
		}

		return node
	}

	const getCell = (container: HTMLElement, column: string) =>
		present<HTMLElement>(
			container.querySelector(`td[data-grid-col="${column}"]`),
			`td[data-grid-col="${column}"]`,
		)

	it('stretches an inferred editor and each editCell control to the width of the cell', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ rows: new Set([1]), onCommit: () => {} }}
			/>,
		)

		for (const column of ['name', 'role', 'due', 'budget']) {
			const slot = await waitFor(() => getSlot(getCell(container, column), 'grid-edit-slot'))

			const host = present<HTMLElement>(slot.parentElement, 'the editor host')

			const editor = editorBox(slot).getBoundingClientRect().width

			// Row scope shows no settle pair, so the slot fills the host.
			expect(slot.getBoundingClientRect().width).toBeCloseTo(host.getBoundingClientRect().width, 0)

			expect(editor, column).toBeCloseTo(slot.getBoundingClientRect().width, 0)

			// The cell is 320px wide, which is wider than the content of each editor.
			expect(editor, column).toBeGreaterThan(250)
		}
	})

	it('puts the settle pair below the cell, out of the width of the editor', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
			/>,
		)

		await userEvent.dblClick(getCell(container, 'name'))

		const cell = getCell(container, 'name')

		const slot = await waitFor(() => getSlot(cell, 'grid-edit-slot'))

		const host = present<HTMLElement>(slot.parentElement, 'the editor host')

		const save = screen.getByRole('button', { name: 'Save Name, row 2' })

		const pair = present<HTMLElement>(save.parentElement, 'the settle pair')

		const pairBox = pair.getBoundingClientRect()

		const cellBox = cell.getBoundingClientRect()

		// The pair keeps the width of its two buttons. It hangs below the cell at
		// its end edge, so the editor keeps the full width of the host.
		expect(pairBox.width).toBeLessThan(100)

		expect(pairBox.top).toBeCloseTo(cellBox.bottom, 0)

		expect(pairBox.right).toBeCloseTo(cellBox.right, 0)

		expect(slot.getBoundingClientRect().width).toBeCloseTo(host.getBoundingClientRect().width, 0)

		expect(editorBox(slot).getBoundingClientRect().width).toBeCloseTo(
			slot.getBoundingClientRect().width,
			0,
		)

		await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}bad')

		const message = await waitFor(() => screen.getByRole('alert'))

		// The message keeps the width of its text, and does not take the width of the cell.
		expect(message.getBoundingClientRect().width).toBeLessThan(
			host.getBoundingClientRect().width / 2,
		)

		// The message starts at the start edge of the cell, below the pair. The
		// message scrolls into view as it mounts, so the boxes are read again.
		expect(message.getBoundingClientRect().left).toBeCloseTo(cell.getBoundingClientRect().left, 0)

		expect(message.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			pair.getBoundingClientRect().bottom,
		)
	})
})
