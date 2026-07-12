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
import { renderUI, screen, userEvent } from '../helpers'
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
		const user = userEvent.setup({ delay: null })

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
 * Focus on close. The modal Overlay family returns focus through floating-ui's
 * previously-focused-element path, which jsdom resolves to `<body>` rather than
 * the trigger; covered in the real-browser suite. Popover restores via a direct
 * `.focus()` on the trigger ref (`useFloatingPanel`'s `returnFocusTo`), which
 * jsdom honours. Menu never moves focus off its trigger in the first place, so
 * closing leaves it there with nothing to restore.
 */
describe('a11y focus: restoration (dropdown family)', () => {
	it('keeps focus on its trigger through open and Escape', async () => {
		const user = userEvent.setup({ delay: null })

		renderUI(
			<Menu placement="bottom-start">
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

		const trigger = screen.getByRole('button', { name: 'Options' })

		await user.click(trigger)

		screen.getByRole('menu')

		// Focus stayed on the trigger while the menu was open, so Escape closes it
		// with the trigger still focused (WCAG 2.4.3) — no restore needed.
		expect(trigger).toHaveFocus()

		await user.keyboard('{Escape}')

		expect(trigger).toHaveFocus()
	})

	// Popover restores via `returnFocusTo: triggerRef` (useFloatingPanel), the
	// same direct-focus path as Menu; jsdom honours it. The test closes via
	// controlled `open`, exercising the restoration wiring directly; real Escape /
	// outside-press routes through floating-ui's `useDismiss` (real-browser-only).
	// A non-modal disclosure must return focus to its trigger on close (WCAG 2.4.3).
	it('popover returns focus to its trigger when it closes', () => {
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

		screen.getByRole('dialog')

		rerender(ui(false))

		expect(screen.getByRole('button', { name: 'Details' })).toHaveFocus()
	})
})
