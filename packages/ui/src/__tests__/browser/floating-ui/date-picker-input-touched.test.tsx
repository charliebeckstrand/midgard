import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { Form } from '../../../modules/form'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'

/**
 * The DatePicker form trap of the 2026-10-26 ui bug audit, with the real
 * floating engine. The jsdom suite mocks `@floating-ui/react`, so the focus moves of an
 * open dialog and a press outside it run only here.
 */
describe('form traps (real browser)', () => {
	// K2-C02: the inner DateInput has no `name`, so the picker marks the field.
	it('marks a bound input DatePicker touched on a close, and not on an open', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ when: undefined as Date | undefined }}
				validate={{ when: (value) => (value ? undefined : 'required') }}
			>
				{/* Above the picker, so the dialog below the input does not cover it. */}
				<button type="button" data-testid="outside">
					Outside
				</button>
				<DatePicker input name="when" aria-label="When" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'datepicker-input')

		// An open from the calendar button moves the focus to the input and the
		// dialog. That is no blur of the field.
		await userEvent.click(screen.getByRole('button', { name: /calendar/i }))

		await screen.findByRole('dialog')

		expect(input).not.toHaveAttribute('aria-invalid', 'true')

		// A press outside closes the dialog, and the close marks the field. The
		// modal dialog hides the page from the accessibility tree.
		await userEvent.click(screen.getByTestId('outside'))

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
	})

	it('marks a bound input DatePicker touched when Tab leaves the input and its button', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ when: undefined as Date | undefined }}
				validate={{ when: (value) => (value ? undefined : 'required') }}
			>
				<DatePicker input name="when" aria-label="When" />
				<button type="button">Next</button>
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'datepicker-input')

		await userEvent.click(input)

		await userEvent.keyboard('{Tab}')

		expect(input).not.toHaveAttribute('aria-invalid', 'true')

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus())

		await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
	})
})
