import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * `input`-mode open focus (real floating engine). Opening the calendar used to
 * seize DOM focus onto the dialog container, dropping it from the editable
 * DateInput (WCAG 2.4.3). `input` mode now passes a negative `initialFocus`
 * (floating-ui's `ignoreInitialFocus`) so focus stays on the reference and the
 * grid is roved through the input's `aria-activedescendant` — the same shape as
 * the Menu dropdown fix. Only the real engine exercises this: the jsdom mock
 * never moves focus into the trap, so the seizure it prevents can't be observed
 * there.
 */
describe('a11y open focus (real browser): date picker input mode', () => {
	it('keeps focus on the input when the calendar opens from a keypress', async () => {
		renderUI(<DatePicker input defaultValue={new Date(2025, 5, 15)} />)

		const input = screen.getByLabelText('Date') as HTMLInputElement

		input.focus()

		await waitFor(() => expect(input).toHaveFocus())

		// ArrowDown opens the calendar; under the real modal focus manager focus
		// must not jump to the dialog container.
		await userEvent.keyboard('{ArrowDown}')

		const dialog = await screen.findByRole('dialog')

		expect(input).toHaveFocus()

		expect(dialog.contains(document.activeElement)).toBe(false)

		// The input owns aria-controls over the day listbox it roves.
		const controls = input.getAttribute('aria-controls')

		expect(controls).toBeTruthy()

		expect(document.getElementById(controls as string)).toHaveAttribute('role', 'listbox')
	})

	it('focuses the input when the calendar opens from a click', async () => {
		renderUI(<DatePicker input />)

		const input = screen.getByLabelText('Date') as HTMLInputElement

		const calendar = screen.getByRole('button', { name: 'Open calendar' })

		await userEvent.click(calendar)

		const dialog = await screen.findByRole('dialog')

		// Open-focus lands on the editable field (not the toggle, not the dialog),
		// and the real modal manager leaves it there — the input sits inside the
		// reference, so focus-out never fires. The user can type immediately.
		await waitFor(() => expect(input).toHaveFocus())

		expect(dialog.contains(document.activeElement)).toBe(false)

		await userEvent.keyboard('12252026')

		expect(input.value).toBe('12/25/2026')
	})

	it('roves the grid via aria-activedescendant and commits on Enter, focus never leaving the input', async () => {
		renderUI(<DatePicker input defaultValue={new Date(2025, 5, 15)} />)

		const input = screen.getByLabelText('Date') as HTMLInputElement

		input.focus()

		await userEvent.keyboard('{ArrowDown}') // open

		await screen.findByRole('dialog')

		await userEvent.keyboard('{ArrowDown}') // materialize the highlight on the 15th

		expect(input).toHaveFocus()

		const active = input.getAttribute('aria-activedescendant')

		expect(active).toBeTruthy()

		// The referenced element is the roved day cell, announced without focus
		// ever entering the dialog.
		expect(document.getElementById(active as string)).toBe(
			screen.getByRole('option', { name: 'Sunday, June 15, 2025' }),
		)

		await userEvent.keyboard('{ArrowDown}') // one week forward → the 22nd

		expect(document.getElementById(input.getAttribute('aria-activedescendant') as string)).toBe(
			screen.getByRole('option', { name: 'Sunday, June 22, 2025' }),
		)

		await userEvent.keyboard('{Enter}') // commit the highlight

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		expect(input.value).toBe('06/22/2025')

		expect(input).toHaveFocus()
	})
})
