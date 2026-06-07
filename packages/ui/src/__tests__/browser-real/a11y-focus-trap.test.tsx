import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogTitle } from '../../components/dialog'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Modal focus-trap gate (real floating engine). The jsdom focus suite
 * (a11y/focus.test.tsx) covers overlay focus-capture and dropdown restoration
 * but explicitly defers the modal Overlay family's trap as real-browser-only:
 * jsdom resolves tabbability to zero-size, so floating-ui's focus guards never
 * engage, and the main browser suite mocks `@floating-ui/react` away entirely.
 * This config keeps the engine real (vitest.browser-real.config.ts), so the trap
 * a keyboard or screen-reader user depends on — focus can't escape an open modal
 * (WCAG 2.4.3 / 2.1.2) — is finally asserted against live behaviour.
 *
 * Dialog stands in for the family: drawer, sheet, confirm, and the command
 * palette all route through the same `Overlay` primitive and its
 * `<FloatingFocusManager modal>`, so trapping is wired once and shared.
 */

const noop = () => {}

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

		// `modal` hides the rest of the document from assistive tech, so the sibling
		// is only reachable with `hidden: true` — that it left the a11y tree at all
		// is the first half of the isolation a screen-reader user depends on.
		const outside = screen.getByRole('button', { name: 'Outside', hidden: true })

		// Opening the modal moves keyboard focus off the document body and into the
		// surface, never onto the sibling left behind it.
		await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
		expect(outside).not.toHaveFocus()

		// Real Tab keystrokes (Playwright-driven) so floating-ui's focus guards
		// engage exactly as they would for a user; the testing-library simulation
		// strands focus on a guard sentinel instead.
		//
		// Forward Tab from the last focusable wraps back to the first instead of
		// escaping to the outside button.
		last.focus()
		await userEvent.keyboard('{Tab}')
		await waitFor(() => expect(first).toHaveFocus())
		expect(dialog.contains(document.activeElement)).toBe(true)
		expect(outside).not.toHaveFocus()

		// Backward Tab from the first focusable wraps to the last — still trapped.
		first.focus()
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
		await waitFor(() => expect(last).toHaveFocus())
		expect(dialog.contains(document.activeElement)).toBe(true)
		expect(outside).not.toHaveFocus()
	})
})
