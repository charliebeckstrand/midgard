import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Dialog, DialogHeader, DialogTitle } from '../../../components/dialog'
import { Menu, MenuContent, MenuItem, MenuSub, MenuTrigger } from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { DensityProvider } from '../../../providers/density'
import { present, renderUI, screen, waitFor } from '../../helpers'

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
	afterEach(() => {
		document.documentElement.removeAttribute('data-density')
	})

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

	it('sizes a menu row and a popover panel at the step of the root', async () => {
		document.documentElement.setAttribute('data-density', 'sm')

		// No scope on the path: the portal writes no step, so each panel follows the root.
		renderUI(
			<>
				<Menu placement="bottom-start">
					<MenuTrigger>
						<button type="button">Open</button>
					</MenuTrigger>
					<MenuContent aria-label="Actions">
						<MenuItem>Copy</MenuItem>
					</MenuContent>
				</Menu>
				<Popover defaultOpen>
					<PopoverTrigger>
						<button type="button">Info</button>
					</PopoverTrigger>
					<PopoverContent aria-label="Info">Body</PopoverContent>
				</Popover>
			</>,
		)

		const panel = await screen.findByRole('dialog', { name: 'Info' })

		expect(getComputedStyle(present(panel.firstElementChild, 'popover body')).paddingTop).toBe(
			'12px',
		)

		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		const row = await screen.findByRole('menuitem', { name: 'Copy' })

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

	it.each([
		['follows the scope of its trigger', undefined, 14],
		['takes its explicit size over the scope of its trigger', 'lg', 18],
	] as const)('a tooltip %s', async (_name, size, font) => {
		renderUI(
			<DensityProvider density="compact">
				<Tooltip delay={0}>
					<TooltipTrigger>
						<button type="button">Details</button>
					</TooltipTrigger>
					<TooltipContent size={size}>Tip</TooltipContent>
				</Tooltip>
			</DensityProvider>,
		)

		await userEvent.keyboard('{Tab}')

		const tip = await screen.findByText('Tip')

		await waitFor(() => expect(fontOf(tip)).toBe(font))
	})
})
