import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { frames, renderUI, screen, waitFor } from '../../helpers'

/**
 * A panel whose trigger scrolls out of its scroll container hides, and comes
 * back when the trigger does. The hide middleware runs only in the real
 * floating engine, because the jsdom suite mocks `@floating-ui/react`.
 */
describe('a Menu whose trigger scrolls out of view (real floating engine)', () => {
	function visibility(panel: Element) {
		return getComputedStyle(panel).visibility
	}

	it('hides the panel while the trigger is out of view', async () => {
		renderUI(
			<div data-testid="scroller" style={{ height: 200, marginTop: 300, overflow: 'auto' }}>
				<div style={{ height: 50 }} />

				<Menu placement="bottom-start" defaultOpen>
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>

					<MenuContent>
						<MenuItem>One</MenuItem>

						<MenuItem>Two</MenuItem>
					</MenuContent>
				</Menu>

				<div style={{ height: 2000 }} />
			</div>,
		)

		await frames()

		const panel = screen.getByRole('menu')

		await waitFor(() => expect(visibility(panel)).toBe('visible'))

		// The trigger leaves the top of the scroller, but stays in the viewport.
		const scroller = screen.getByTestId('scroller')

		scroller.scrollTop = 130

		await waitFor(() => expect(visibility(panel)).toBe('hidden'))

		scroller.scrollTop = 0

		await waitFor(() => expect(visibility(panel)).toBe('visible'))
	})
})
