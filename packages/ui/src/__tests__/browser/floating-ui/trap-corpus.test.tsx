import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { traps } from '../../a11y/cases'
import { renderUI, screen, waitFor } from '../../helpers'
import { tabbables } from '../helpers/tabbables'

/**
 * Modal focus-trap gate (real floating engine). Sweeps the trap corpus
 * (`a11y/cases/traps.tsx`) — the modal Overlay family — asserting the trap a
 * keyboard or screen-reader user depends on (WCAG 2.4.3 / 2.1.2): opening
 * pulls focus off the trigger into the surface, real Tab keystrokes wrap
 * within it in both directions, and Escape dismisses and returns focus to the
 * trigger.
 *
 * jsdom resolves tabbability to zero-size; floating-ui's focus guards never
 * engage there, and the `browser` project mocks `@floating-ui/react` away.
 * This project keeps the engine real (the `floating-ui` project in
 * vitest.browser.config.ts). Real keystrokes are required: testing-library
 * simulation strands focus on a guard sentinel.
 */
describe('a11y focus trap (real browser): modal family', () => {
	it.each(
		traps,
	)('%s contains Tab and restores focus on Escape', async (_name, trigger, element, surface) => {
		renderUI(element)

		await userEvent.click(screen.getByRole('button', { name: trigger }))

		const panel = await surface()

		// Opening moves keyboard focus into the surface, off the trigger.
		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		expect(screen.getByRole('button', { name: trigger, hidden: true })).not.toHaveFocus()

		const focusables = tabbables(panel)

		const first = focusables[0] as HTMLElement

		const last = focusables[focusables.length - 1] as HTMLElement

		expect(first).toBeDefined()

		// Forward Tab from the last focusable wraps back to the first…
		last.focus()

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(first).toHaveFocus())

		expect(panel.contains(document.activeElement)).toBe(true)

		// …and backward Tab from the first wraps to the last.
		first.focus()

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(last).toHaveFocus())

		expect(panel.contains(document.activeElement)).toBe(true)

		// Escape dismisses the surface and returns focus to the trigger.
		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(panel.isConnected).toBe(false))

		// Re-query: the trigger node may be recreated across the open/close cycle.
		await waitFor(() => expect(screen.getByRole('button', { name: trigger })).toHaveFocus())
	})
})
