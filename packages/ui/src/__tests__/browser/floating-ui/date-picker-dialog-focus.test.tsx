import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * The dialog of the DatePicker follows the APG date picker dialog in the real
 * floating engine: the open moves DOM focus to the selected day, the keys move
 * the focus, and Escape returns it to the trigger. The focus manager of
 * floating-ui reads the open focus in a microtask, so only a real browser runs
 * the full path.
 */
describe('DatePicker dialog focus (real browser)', () => {
	it('moves DOM focus through the days and returns it to the trigger', async () => {
		renderUI(<DatePicker aria-label="Due date" defaultValue={new Date(2025, 5, 15)} />)

		const trigger = screen.getByRole('combobox', { name: 'Due date' })

		trigger.focus()

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(document.activeElement).toHaveAttribute('data-date', '2025-06-15'))

		await userEvent.keyboard('{ArrowRight}')

		expect(document.activeElement).toHaveAttribute('data-date', '2025-06-16')

		await userEvent.keyboard('{PageDown}')

		expect(document.activeElement).toHaveAttribute('data-date', '2025-07-16')

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(trigger).toHaveFocus())

		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	})

	it('moves DOM focus to the start of a range when the range dialog opens', async () => {
		renderUI(
			<DatePicker
				range
				aria-label="Stay"
				defaultValue={[new Date(2025, 5, 10), new Date(2025, 5, 12)]}
			/>,
		)

		screen.getByRole('combobox', { name: 'Stay' }).focus()

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(document.activeElement).toHaveAttribute('data-date', '2025-06-10'))

		const selected = screen
			.getAllByRole('option', { selected: true })
			.map((day) => day.getAttribute('data-date'))

		expect(selected).toEqual(['2025-06-10', '2025-06-11', '2025-06-12'])
	})
})
