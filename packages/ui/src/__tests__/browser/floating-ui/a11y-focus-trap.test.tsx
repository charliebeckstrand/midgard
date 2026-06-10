import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Dialog, DialogBody, DialogTitle } from '../../../components/dialog'
import { noop, renderUI, screen, waitFor } from '../../helpers'

/**
 * Modal focus-trap gate (real floating engine). Asserts the trap a keyboard or
 * screen-reader user depends on: focus can't escape an open modal (WCAG 2.4.3 /
 * 2.1.2). jsdom resolves tabbability to zero-size; floating-ui's focus guards
 * never engage there, and the `browser` project mocks `@floating-ui/react` away.
 * This project keeps the engine real (the `floating-ui` project in
 * vitest.browser.config.ts).
 *
 * Dialog stands in for the family: drawer, sheet, confirm, and the command
 * palette all route through the same `Overlay` primitive and its
 * `<FloatingFocusManager modal>`; trapping is wired once and shared.
 */

/**
 * An open modal dialog with two focusables, rendered next to a sibling button
 * that lives outside the dialog. A correct trap keeps Tab cycling between the
 * two inner buttons and never lets focus reach the outsider.
 */
function TrappedDialog() {
	return (
		<>
			<Button>Outside</Button>
			<Dialog open onOpenChange={noop}>
				<DialogTitle>Edit profile</DialogTitle>
				<DialogBody>
					<Button>First</Button>
					<Button>Last</Button>
				</DialogBody>
			</Dialog>
		</>
	)
}

describe('a11y focus trap (real browser) — modal overlay', () => {
	it('pulls focus into the dialog on open and cycles Tab within it', async () => {
		renderUI(<TrappedDialog />)

		const dialog = await screen.findByRole('dialog')

		const first = screen.getByRole('button', { name: 'First' })
		const last = screen.getByRole('button', { name: 'Last' })

		// `modal` hides the rest of the document from assistive tech; `hidden: true`
		// reaches the sibling outside the a11y tree.
		const outside = screen.getByRole('button', { name: 'Outside', hidden: true })

		// Opening the modal moves keyboard focus into the surface, not the sibling.
		await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

		expect(outside).not.toHaveFocus()

		// Real Tab keystrokes (Playwright-driven): floating-ui's focus guards
		// engage; testing-library simulation strands focus on a guard sentinel.
		//
		// Forward Tab from the last focusable wraps back to the first.
		last.focus()

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(first).toHaveFocus())

		expect(dialog.contains(document.activeElement)).toBe(true)

		expect(outside).not.toHaveFocus()

		// Backward Tab from the first focusable wraps to the last.
		first.focus()

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(last).toHaveFocus())

		expect(dialog.contains(document.activeElement)).toBe(true)

		expect(outside).not.toHaveFocus()
	})
})
