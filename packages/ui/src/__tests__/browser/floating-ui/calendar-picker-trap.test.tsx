import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Month/year picker focus trap (real floating engine). The picker is a modal
 * `PopoverContent` nested inside the date picker's own modal dialog; its
 * `FloatingFocusManager` must contain Tab while open (WCAG 2.4.3 / 2.1.2)
 * rather than let focus walk out into the calendar beneath. The jsdom suite
 * mocks `@floating-ui/react` away, so only this project can assert it.
 */
describe('a11y focus trap (real browser) — calendar month picker', () => {
	it('cycles Tab inside the open month picker', async () => {
		renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} />)

		await userEvent.click(screen.getByRole('button'))

		await userEvent.click(await screen.findByRole('button', { name: /June 2025/ }))

		// The picker focuses its selected cell on open.
		const jun = await screen.findByRole('option', { name: 'Jun', selected: true })

		await waitFor(() => expect(jun).toHaveFocus())

		const panel = jun.closest('[data-slot="popover-content"]') as HTMLElement

		// Backward Tab from the picker's first tabbable wraps to its last.
		screen.getByRole('button', { name: 'Previous year' }).focus()

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(screen.getByRole('option', { name: 'Dec' })).toHaveFocus())

		expect(panel.contains(document.activeElement)).toBe(true)

		// Forward Tab from the last wraps back to the first.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'Previous year' })).toHaveFocus())

		expect(panel.contains(document.activeElement)).toBe(true)
	})
})
