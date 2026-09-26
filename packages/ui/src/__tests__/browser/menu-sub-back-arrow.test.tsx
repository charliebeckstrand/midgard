import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuSub } from '../../components/menu'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * The back arrow closes a submenu and returns focus to its parent row.
 *
 * A panel comment said ArrowLeft led back to the parent menu, but only `Escape` did. The WAI-ARIA
 * APG menu pattern closes a submenu on ArrowLeft, and on ArrowRight in a right-to-left menu. The
 * key reads the direction through `logicalArrowKey`. The real browser resolves the `dir`
 * attribute into the computed `direction`, which jsdom does not.
 */
describe('submenu back arrow (real browser)', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('dir')
	})

	for (const dir of ['ltr', 'rtl'] as const) {
		const back = dir === 'ltr' ? '{ArrowLeft}' : '{ArrowRight}'

		const away = dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}'

		it(`closes the submenu on ${back} in ${dir}, and not on ${away}`, async () => {
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

			await userEvent.keyboard('{Enter}')

			const nested = await screen.findByRole('menuitem', { name: 'Nested' })

			await waitFor(() => expect(document.activeElement).toBe(nested))

			// The other arrow leaves the submenu open.
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
