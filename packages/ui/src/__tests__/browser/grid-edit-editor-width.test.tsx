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
 * settle pair and the validation message keep their own widths. Real browser,
 * because the widths need a layout engine.
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

	const cellOf = (container: HTMLElement, col: string) =>
		present<HTMLElement>(
			container.querySelector(`td[data-grid-col="${col}"]`),
			`td[data-grid-col="${col}"]`,
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

		for (const col of ['name', 'role', 'due', 'budget']) {
			const slot = await waitFor(() => getSlot(cellOf(container, col), 'grid-edit-slot'))

			const host = present<HTMLElement>(slot.parentElement, 'the editor host')

			const editor = editorBox(slot).getBoundingClientRect().width

			// Row scope shows no settle pair, so the slot fills the host.
			expect(slot.getBoundingClientRect().width).toBeCloseTo(host.getBoundingClientRect().width, 0)

			expect(editor, col).toBeCloseTo(slot.getBoundingClientRect().width, 0)

			// The cell is 320px wide, which is wider than the content of each editor.
			expect(editor, col).toBeGreaterThan(250)
		}
	})

	it('keeps the settle pair and the validation message at their own widths', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
			/>,
		)

		await userEvent.dblClick(cellOf(container, 'name'))

		const slot = await waitFor(() => getSlot(cellOf(container, 'name'), 'grid-edit-slot'))

		const host = present<HTMLElement>(slot.parentElement, 'the editor host')

		const save = screen.getByRole('button', { name: 'Save Name, row 1' })

		const pair = present<HTMLElement>(save.parentElement, 'the settle pair')

		const pairBox = pair.getBoundingClientRect()

		const slotBox = slot.getBoundingClientRect()

		// The pair keeps the width of its two buttons, and the editor stops at it.
		expect(pairBox.width).toBeLessThan(100)

		expect(slotBox.right).toBeLessThanOrEqual(pairBox.left + 1)

		expect(pairBox.right).toBeLessThanOrEqual(host.getBoundingClientRect().right + 1)

		expect(editorBox(slot).getBoundingClientRect().width).toBeCloseTo(slotBox.width, 0)

		await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}bad')

		const message = await waitFor(() => screen.getByRole('alert'))

		// The message keeps the width of its text, and does not take the width of the cell.
		expect(message.getBoundingClientRect().width).toBeLessThan(
			host.getBoundingClientRect().width / 2,
		)
	})
})
