import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { DatePicker } from '../../../components/date-picker'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * `input`-mode Tab cycle (real floating engine). The editable DateInput and
 * its calendar button stay outside `FloatingFocusManager`'s modal guards, so
 * `useDatePickerInputTab` must close the loop itself: DateInput → calendar
 * button → dialog content → back to the DateInput, never out into the
 * aria-hidden page behind the dialog (WCAG 2.4.3 / 2.1.2). Only this project
 * can assert it: the jsdom suite mocks `@floating-ui/react`, and real Tab
 * keystrokes are what engage (or leak past) the trap.
 */
describe('a11y focus trap (real browser) — date picker input mode', () => {
	it('cycles Tab through the input, calendar button, and dialog while open', async () => {
		renderUI(
			<>
				<Button>Before</Button>
				<DatePicker input defaultValue={new Date(2025, 5, 15)} />
				<Button>After</Button>
			</>,
		)

		const input = screen.getByLabelText('Date')
		const calendarButton = screen.getByRole('button', { name: 'Open the calendar' })

		await userEvent.click(calendarButton)

		const dialog = await screen.findByRole('dialog')

		const outside = screen.getByRole('button', { name: 'After', hidden: true })

		// Editing while open is supported: focus moves into the input on click.
		await userEvent.click(input)

		await waitFor(() => expect(input).toHaveFocus())

		// Forward: input → calendar button → into the dialog at its first
		// tabbable, not out into the page behind it.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(calendarButton).toHaveFocus())

		await userEvent.keyboard('{Tab}')

		await waitFor(() =>
			expect(screen.getByRole('button', { name: 'Previous month' })).toHaveFocus(),
		)

		expect(outside).not.toHaveFocus()

		expect(dialog.contains(document.activeElement)).toBe(true)

		// Backward: dialog's first tabbable → calendar button → input.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(calendarButton).toHaveFocus())

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(input).toHaveFocus())

		// Backward from the cycle's first element wraps to the dialog's last.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'Today' })).toHaveFocus())

		// Forward from the dialog's last tabbable returns to the input.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(input).toHaveFocus())

		// The whole walk kept the dialog open.
		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})
})
