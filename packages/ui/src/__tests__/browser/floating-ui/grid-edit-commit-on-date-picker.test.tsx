import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI, screen, waitFor } from '../../helpers'

/**
 * A date picker in an `editCell` slot under `commitOn: 'leaveEditor'` (real
 * floating engine). The calendar is a portaled surface that the editor opens,
 * so a press in it is not a focus move out of the editor, and the session
 * holds. The jsdom suite mocks `FloatingPortal` down to an inline render with
 * no `data-floating-ui-portal`, so only this project can prove the exemption.
 */
describe('grid commit on leave vs a date picker slot (real floating engine)', () => {
	type Row = { id: number; due: string }

	const rows: Row[] = [{ id: 1, due: '2026-01-15' }]

	const columns: GridColumn<Row>[] = [
		{
			id: 'due',
			title: 'Due',
			field: 'due',
			cell: (r) => r.due,
			editCell: ({ value, onValueUpdate, ariaLabel }) => (
				<DatePicker
					input
					format="YYYY-MM-DD"
					aria-label={ariaLabel}
					value={typeof value === 'string' ? new Date(`${value}T00:00:00`) : undefined}
					onValueChange={(date) =>
						onValueUpdate(
							date
								? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
								: '',
						)
					}
				/>
			),
		},
	]

	it('keeps the session while the calendar picks a date, and commits on a move out', async () => {
		const onCommit = vi.fn()

		const view = renderUI(
			<>
				<button type="button">Outside</button>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(r) => r.id}
					editable={{ session: 'managed', scope: 'cell', commitOn: 'leaveEditor', onCommit }}
				/>
			</>,
		)

		await userEvent.dblClick(
			present(view.container.querySelector<HTMLElement>('td[data-grid-col="due"]'), 'due'),
		)

		await userEvent.click(screen.getByRole('button', { name: 'Open calendar' }))

		const dialog = await screen.findByRole('dialog')

		// The calendar is the editor's own portaled surface.
		expect(dialog.closest('[data-floating-ui-portal]')).not.toBeNull()

		// Tab walks from the input through the calendar button into the calendar.
		// Focus leaves the cell for the surface, and the session holds.
		await userEvent.keyboard('{Tab}{Tab}')

		await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

		expect(onCommit).not.toHaveBeenCalled()

		await userEvent.click(screen.getByRole('option', { name: /January 20, 2026/ }))

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		// The pick went through the surface, so the session still holds the cell.
		expect(onCommit).not.toHaveBeenCalled()

		const input = screen.getByRole('textbox', { name: 'Edit Due, row 1' })

		expect(input).toBeInTheDocument()

		await userEvent.click(screen.getByRole('button', { name: 'Outside' }))

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'due', value: '2026-01-20' },
		])

		expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus()
	})
})
