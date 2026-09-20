import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { SidebarLayout } from '../../../layouts/sidebar/sidebar'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Outside-press on the floating sidebar's own menu (real floating engine).
 *
 * The floating variant hosts the sidebar in a non-modal `Sheet`, which
 * dismisses on a pointer press outside its `Overlay` root. A `Menu` opened from
 * inside the sidebar portals out of that root, so plain DOM containment reads a
 * press on one of its items as outside: the sheet closed on pointer-down and
 * unmounted the menu before its click could fire, and every item in the user
 * dropdown — impersonate, stop impersonating, sign out — did nothing at all.
 *
 * The jsdom suite mocks `@floating-ui/react` away, so overlay panels render
 * inline there and the press never leaves the subtree; only this project sees
 * the real portal.
 */
describe('floating sidebar menu dismissal (real browser)', () => {
	function FloatingSidebar({ onAction }: { onAction: () => void }) {
		return (
			<Menu placement="top-start">
				<MenuTrigger>
					<button type="button">user menu</button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem onAction={onAction}>Impersonate user</MenuItem>
				</MenuContent>
			</Menu>
		)
	}

	async function openPeekMenu(sidebar: React.ReactNode) {
		const { container } = renderUI(
			<SidebarLayout sidebar={sidebar} floating>
				<p data-testid="page-body">page body</p>
			</SidebarLayout>,
		)

		fireEvent.pointerEnter(container.querySelector('[aria-hidden="true"]') as HTMLElement)

		const trigger = await screen.findByRole('button', { name: 'user menu' })

		fireEvent.pointerDown(trigger)
		fireEvent.click(trigger)

		return screen.findByRole('menuitem', { name: 'Impersonate user' })
	}

	function pressOn(element: HTMLElement) {
		const rect = element.getBoundingClientRect()

		fireEvent.pointerDown(element, { clientX: rect.left + 4, clientY: rect.top + 4 })
	}

	it('keeps the peek open so a menu item press reaches its action', async () => {
		let actions = 0

		const item = await openPeekMenu(<FloatingSidebar onAction={() => actions++} />)

		pressOn(item)

		expect(screen.getByRole('button', { name: 'user menu' })).toBeInTheDocument()

		fireEvent.click(item)

		expect(actions).toBe(1)
	})

	// The peek also closes on `pointerleave` of its wrapper. React routes synthetic
	// enter/leave through the React tree, so the portalled menu counts as inside it
	// and the travel from trigger to item does not close the peek — the press path
	// above is not the only way this gesture can break.
	it('keeps the peek open while the pointer travels onto the menu', async () => {
		const item = await openPeekMenu(<FloatingSidebar onAction={() => {}} />)

		await userEvent.hover(item)

		expect(screen.getByRole('button', { name: 'user menu' })).toBeInTheDocument()
	})

	it('still dismisses the peek on a press outside it', async () => {
		await openPeekMenu(<FloatingSidebar onAction={() => {}} />)

		pressOn(screen.getByTestId('page-body'))

		await waitFor(() =>
			expect(screen.queryByRole('button', { name: 'user menu' })).not.toBeInTheDocument(),
		)
	})
})
