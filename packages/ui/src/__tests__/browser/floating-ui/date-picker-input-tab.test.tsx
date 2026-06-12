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
		const calendarButton = screen.getByRole('button', { name: 'Open calendar' })

		await userEvent.click(calendarButton)

		const dialog = await screen.findByRole('dialog')

		// Text query, not role: the open trap marks the sibling aria-hidden
		// directly, which empties its computed accessible name.
		const outside = screen.getByText('After').closest('button') as HTMLElement

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

	it('keeps the editable reference group visible to AT while open', async () => {
		renderUI(
			<>
				<Button>Outside</Button>
				<DatePicker input />
			</>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Open calendar' }))

		await screen.findByRole('dialog')

		// The group the user can type into carries no aria-hidden marking
		// (WCAG 4.1.2; axe `aria-hidden-focus`): role queries resolve it
		// through the accessibility tree.
		const input = screen.getByRole('textbox', { name: 'Date' })

		expect(input.closest('[aria-hidden="true"]')).toBeNull()

		expect(input.closest('[data-floating-ui-inert]')).toBeNull()

		expect(screen.getByRole('button', { name: 'Open calendar' })).toBeInTheDocument()

		// Modal semantics hold for the rest of the page: the sibling button is
		// still marked away from AT (text query — aria-hidden empties its
		// computed accessible name).
		const outside = screen.getByText('Outside').closest('button') as HTMLElement

		expect(outside.closest('[aria-hidden="true"]')).not.toBeNull()
	})
})
