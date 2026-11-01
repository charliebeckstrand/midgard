import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { CurrencyInput } from '../../components/currency-input'
import { DatePicker } from '../../components/date-picker'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import { present, renderUI, waitFor } from '../helpers'
import { gridCell } from '../helpers/grid-cells'

/**
 * In the automatic table layout, an open editor is content of its column. The
 * column is at least as wide as the editor needs to show its value in full,
 * with its frame and icons. That is true for the editors of an open row and for
 * the editors of the new-row slot. Once the grid holds the widths, a new value
 * moves no column. Real browser, because the widths need a layout engine.
 */
describe('grid editor content width (real browser)', () => {
	type Row = { id: number; role: string; due: Date; budget: number }

	const rows: Row[] = [{ id: 1, role: 'progress', due: new Date(2026, 0, 15), budget: 1200 }]

	const roles = [
		{ value: 'todo', label: 'To do' },
		{ value: 'progress', label: 'In progress' },
	]

	const columns: GridColumn<Row>[] = [
		{
			id: 'role',
			title: 'Role',
			field: 'role',
			cell: (row) => row.role,
			editCell: (ctx) => (
				<Listbox<string>
					aria-label={ctx.ariaLabel}
					value={typeof ctx.value === 'string' && ctx.value !== '' ? ctx.value : null}
					onValueChange={(next) => ctx.onValueUpdate(next ?? '')}
					displayValue={(key) => roles.find((role) => role.value === key)?.label ?? key}
				>
					{roles.map((role) => (
						<ListboxOption key={role.value} value={role.value}>
							<ListboxLabel>{role.label}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			),
		},
		{
			id: 'due',
			title: 'Due',
			field: 'due',
			cell: (row) => row.due.toDateString(),
			editCell: (ctx) => (
				<DatePicker
					input
					format="YYYY-MM-DD"
					aria-label={ctx.ariaLabel}
					value={ctx.value instanceof Date ? ctx.value : undefined}
					onValueChange={(date) => ctx.onValueUpdate(date ?? undefined)}
				/>
			),
		},
		{
			id: 'budget',
			title: 'Budget',
			field: 'budget',
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

	/** Whether the text field of an editor shows its value in full. A rounding of 1px is allowed. */
	const fieldFits = (field: HTMLInputElement) => field.scrollWidth <= field.clientWidth + 1

	/** Whether the label of a listbox trigger shows in full. */
	const labelFits = (button: HTMLElement) =>
		[...button.querySelectorAll<HTMLElement>('span')].every(
			(span) => span.scrollWidth <= span.clientWidth + 1,
		)

	/** The width (px) of the header cell of each column. */
	const headerWidths = (container: HTMLElement) =>
		[...container.querySelectorAll<HTMLElement>('thead th[data-grid-col]')].map(
			(th) => th.getBoundingClientRect().width,
		)

	/** The open row of a manual session. */
	const openRow: GridEditableConfig = { rows: new Set([1]), onCommit: () => {} }

	/** The new-row slot of a managed session. */
	const newRow: GridEditableConfig = {
		session: 'managed',
		newRow: 'bottom',
		onCommit: () => {},
		onRowAdd: () => {},
	}

	const renderNarrow = (editable: GridEditableConfig) =>
		renderUI(
			<div style={{ width: '240px' }}>
				<Grid columns={columns} rows={rows} getKey={(row) => row.id} editable={editable} />
			</div>,
		)

	it('sizes each column to the value of its open editor in a narrow grid', async () => {
		const { container } = renderNarrow(openRow)

		await waitFor(() => expect(container.querySelector('table[data-grid-fit-held]')).not.toBeNull())

		const role = present<HTMLElement>(
			gridCell(container, 'role').querySelector('button'),
			'the listbox trigger',
		)

		expect(role).toHaveTextContent('In progress')

		expect(labelFits(role)).toBe(true)

		for (const column of ['due', 'budget']) {
			const field = present<HTMLInputElement>(
				gridCell(container, column).querySelector('input'),
				`the ${column} field`,
			)

			expect(field.value, column).not.toBe('')

			expect(fieldFits(field), column).toBe(true)
		}
	})

	it('sizes a column to the placeholder of a new-row editor', async () => {
		const { container } = renderNarrow(newRow)

		await waitFor(() => expect(container.querySelector('table[data-grid-fit-held]')).not.toBeNull())

		const cell = present<HTMLElement>(
			container.querySelector('td[data-grid-new-col="role"]'),
			'the new-row role cell',
		)

		const trigger = present<HTMLElement>(cell.querySelector('button'), 'the listbox trigger')

		expect(labelFits(trigger)).toBe(true)
	})

	it('moves no column when the value of an editor changes', async () => {
		const { container } = renderNarrow(openRow)

		await waitFor(() => expect(container.querySelector('table[data-grid-fit-held]')).not.toBeNull())

		const before = headerWidths(container)

		const field = present<HTMLInputElement>(
			gridCell(container, 'budget').querySelector('input'),
			'the budget field',
		)

		await userEvent.clear(field)

		await userEvent.type(field, '123456789')

		expect(headerWidths(container)).toEqual(before)
	})
})
