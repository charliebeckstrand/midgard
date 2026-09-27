import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Dialog, DialogHeader, DialogTitle } from '../../../components/dialog'
import { Menu, MenuContent, MenuItem, MenuSub, MenuTrigger } from '../../../components/menu'
import { DensityProvider } from '../../../providers/density'
import { renderUI, screen } from '../../helpers'

/**
 * A portal takes a panel out of the DOM subtree of its density scope. The root of an Overlay or a
 * FloatingSurface writes the step of its React parent as `data-density`. Thus a panel in a portal
 * follows the scope of the place that opened it.
 *
 * Rides the real floating engine because the jsdom and default browser suites render a portal
 * inline, inside the scope. There the claim passes with no bridge.
 */
const fontOf = (node: HTMLElement) => Number.parseFloat(getComputedStyle(node).fontSize)

describe('density scopes across portals (real browser)', () => {
	it.each([
		['takes md outside a scope', undefined, 18],
		['follows a compact provider', 'compact', 16],
	] as const)('a dialog title %s', (_name, density, font) => {
		const dialog = (
			<Dialog open onOpenChange={() => {}}>
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
			</Dialog>
		)

		renderUI(density ? <DensityProvider density={density}>{dialog}</DensityProvider> : dialog)

		const title = screen.getByText('Settings')

		expect(title.closest('[data-slot="density"]')).toBeNull()

		expect(fontOf(title)).toBe(font)
	})

	it('sizes a menu row at the step of a compact provider', async () => {
		renderUI(
			<DensityProvider density="compact">
				<Menu placement="bottom-start">
					<MenuTrigger>
						<button type="button">Open</button>
					</MenuTrigger>
					<MenuContent aria-label="Actions">
						<MenuItem>Copy</MenuItem>
					</MenuContent>
				</Menu>
			</DensityProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		const row = await screen.findByRole('menuitem', { name: 'Copy' })

		expect(row.closest('[data-slot="density"]')).toBeNull()

		expect(fontOf(row)).toBe(14)
	})

	it('sizes a submenu row at the step of its parent menu', async () => {
		renderUI(
			<DensityProvider density="compact">
				<Menu defaultOpen size="lg">
					<MenuContent aria-label="Actions">
						<MenuSub label="More">
							<MenuItem>Nested</MenuItem>
						</MenuSub>
					</MenuContent>
				</Menu>
			</DensityProvider>,
		)

		await userEvent.click(screen.getByRole('menuitem', { name: /More/ }))

		const row = await screen.findByRole('menuitem', { name: 'Nested' })

		expect(fontOf(row)).toBe(18)
	})
})
