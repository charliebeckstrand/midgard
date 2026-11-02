import { beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker, type DatePickerProps } from '../../../components/date-picker'
import { bySlot, renderUI, screen, stubMatchMedia, waitFor, within } from '../../helpers'

/**
 * The focus return of the DatePicker sheet, with the real floating engine. The
 * calendar button keeps the focus where it is as it opens the sheet, so the
 * focus manager of the sheet can record an unrelated control, such as the next
 * editor in a grid row. When the sheet closes, the focus must go to the field,
 * not to that control. The jsdom suite mocks the focus manager, so only this
 * suite shows the return.
 */
describe('DatePicker sheet focus return (real browser)', () => {
	// A phone: no hover and a narrow viewport.
	beforeEach(() => {
		stubMatchMedia((query) => query.startsWith('(hover: none)'))
	})

	function renderWithNotes(props: DatePickerProps) {
		renderUI(
			<>
				<DatePicker aria-label="Due date" {...props} />
				<textarea aria-label="Notes" />
			</>,
		)

		const notes = screen.getByRole('textbox', { name: 'Notes' })

		notes.focus()

		return notes
	}

	async function closeWith(how: 'close' | 'backdrop') {
		const sheet = await screen.findByRole('dialog', { name: 'Choose date' })

		await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true))

		if (how === 'close') {
			await userEvent.click(within(sheet).getByRole('button', { name: 'Close' }))
		} else {
			const backdrop = bySlot(document.body, 'overlay-backdrop')

			if (!backdrop) throw new Error('No backdrop')

			await userEvent.click(backdrop, { position: { x: 4, y: 4 } })
		}

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	}

	it.each(['close', 'backdrop'] as const)(
		'returns focus to the input in input mode (%s)',
		async (how) => {
			const notes = renderWithNotes({ input: true })

			await userEvent.click(screen.getByRole('button', { name: 'Open calendar' }))

			await closeWith(how)

			await waitFor(() => expect(screen.getByRole('textbox', { name: 'Due date' })).toHaveFocus())

			expect(notes).not.toHaveFocus()
		},
	)

	it('returns focus to the trigger', async () => {
		const notes = renderWithNotes({})

		const trigger = screen.getByRole('combobox', { name: 'Due date' })

		await userEvent.click(trigger)

		await closeWith('close')

		await waitFor(() => expect(trigger).toHaveFocus())

		expect(notes).not.toHaveFocus()
	})
})
