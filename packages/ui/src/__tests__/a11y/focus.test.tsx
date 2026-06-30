import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { renderUI, screen, userEvent, waitFor } from '../helpers'
import { focus } from './cases'

/**
 * Focus-management gate. Asserts that opening a dismissable overlay pulls
 * keyboard focus off the trigger and into the surface (WCAG 2.4.3), the
 * half of focus behaviour jsdom can observe. Each case (`cases/focus.tsx`)
 * drives the real open interaction and returns the trigger focus left.
 */
describe('a11y focus: overlays capture focus on open', () => {
	it.each(
		focus,
	)('%s moves focus off the trigger into the surface', async (_name, element, open) => {
		const user = userEvent.setup()

		renderUI(element)

		const trigger = await open(user)

		// Focus leaves the trigger…
		expect(trigger).not.toHaveFocus()

		// …and lands on a real element inside the surface.
		expect(document.activeElement).not.toBe(document.body)

		expect(document.activeElement).not.toBeNull()
	})
})

/**
 * Focus restoration on close. The modal Overlay family returns focus through
 * floating-ui's previously-focused-element path, which jsdom resolves to
 * `<body>` rather than the trigger; covered in the real-browser suite. The
 * dropdown family restores via a direct `.focus()` on the trigger ref
 * (`useFloatingUI`'s `restoreFocusTo`), which jsdom honours; Menu stands in
 * for that path.
 */
describe('a11y focus: restoration (dropdown family)', () => {
	it('menu returns focus to its trigger on Escape', async () => {
		const user = userEvent.setup()

		renderUI(
			<Menu>
				<MenuTrigger>
					<Button variant="outline">Options</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuSection>
						<MenuItem>
							<MenuLabel>Edit</MenuLabel>
						</MenuItem>
					</MenuSection>
				</MenuContent>
			</Menu>,
		)

		await user.click(screen.getByRole('button', { name: 'Options' }))

		await screen.findByRole('menu')

		await user.keyboard('{Escape}')

		// Re-query: the trigger node is recreated across the open/close cycle.
		await waitFor(() => expect(screen.getByRole('button', { name: 'Options' })).toHaveFocus())
	})

	// Popover restores via `returnFocusTo: triggerRef` (useFloatingPanel), the
	// same direct-focus path as Menu; jsdom honours it. The test closes via
	// controlled `open`, exercising the restoration wiring directly; real Escape /
	// outside-press routes through floating-ui's `useDismiss` (real-browser-only).
	// A non-modal disclosure must return focus to its trigger on close (WCAG 2.4.3).
	it('popover returns focus to its trigger when it closes', async () => {
		const ui = (open: boolean) => (
			<Popover open={open} onOpenChange={() => {}}>
				<PopoverTrigger>
					<Button variant="outline">Details</Button>
				</PopoverTrigger>
				<PopoverContent autoFocus aria-label="Details">
					<Button>Inside</Button>
				</PopoverContent>
			</Popover>
		)

		const { rerender } = renderUI(ui(true))

		await screen.findByRole('dialog')

		rerender(ui(false))

		await waitFor(() => expect(screen.getByRole('button', { name: 'Details' })).toHaveFocus())
	})
})
