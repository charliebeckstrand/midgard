import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuSub } from '../../components/menu'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * The forward arrow opens a submenu onto its first row, and the back arrow
 * closes it and returns focus to its parent row.
 *
 * A panel comment said ArrowLeft led back to the parent menu, but only `Escape` did. The WAI-ARIA
 * APG menu pattern opens a submenu on ArrowRight and closes it on ArrowLeft, and swaps the two in a
 * right-to-left menu. The keys follow the reading direction, not the side that the panel takes.
 * The key reads the direction through `logicalArrowKey`. The real browser resolves the `dir`
 * attribute into the computed `direction`, which jsdom does not.
 */
describe('submenu arrows (real browser)', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('dir')
	})

	for (const dir of ['ltr', 'rtl'] as const) {
		const back = dir === 'ltr' ? '{ArrowLeft}' : '{ArrowRight}'

		const away = dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}'

		it(`opens the submenu on ${away} and closes it on ${back} in ${dir}`, async () => {
			document.documentElement.dir = dir

			renderUI(
				<Menu defaultOpen>
					<MenuContent aria-label="Actions">
						<MenuItem>Copy</MenuItem>
						<MenuSub label="More">
							<MenuItem>Nested</MenuItem>
						</MenuSub>
					</MenuContent>
				</Menu>,
			)

			const trigger = screen.getByRole('menuitem', { name: /More/ })

			trigger.focus()

			await userEvent.keyboard(away)

			const nested = await screen.findByRole('menuitem', { name: 'Nested' })

			await waitFor(() => expect(document.activeElement).toBe(nested))

			// The forward arrow on a row with no submenu leaves the submenu open.
			await userEvent.keyboard(away)

			expect(trigger).toHaveAttribute('aria-expanded', 'true')

			await userEvent.keyboard(back)

			await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))

			expect(document.activeElement).toBe(trigger)

			// The enclosing menu stays open.
			expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
		})
	}
})
