import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { renderUI, screen } from '../../helpers'

/**
 * A static `Menu`'s trigger reports no open-state change against the live engine.
 *
 * `useMenuState` passes `enabled: !isStatic` to `useClick`, because a static menu
 * owns no disclosure and a press has nothing to toggle. The guard must sit there
 * rather than lean on `stickIfOpen`: that option tests `dataRef.current.openEvent`,
 * which floating-ui writes only when an event opens the surface, so a `defaultOpen`
 * menu carries none and the test falls through to the click-close. An enabled
 * `useClick` therefore reports `onOpenChange(false)` over a panel that stays
 * mounted, and a second press reports `true`.
 *
 * The jsdom projects cannot hold this guarantee: their `@floating-ui/react` double
 * suppresses the close for any surface a click did not open, which is the opposite
 * of the live behaviour for this one case. The assertion belongs here.
 */
describe('static MenuTrigger (real floating engine)', () => {
	it('reports no open-state change on a press, and keeps the panel mounted', async () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Menu defaultOpen onOpenChange={onOpenChange}>
				<MenuTrigger>Options</MenuTrigger>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
					<MenuItem>Duplicate</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const trigger = screen.getByRole('button', { name: 'Options' })

		await userEvent.click(trigger)

		expect(onOpenChange).not.toHaveBeenCalled()

		// A second press is the one that exposed the defect: with the interaction
		// enabled the first reports `false` and the second `true`, so one press alone
		// cannot tell a working guard from a panel that ignores the report.
		await userEvent.click(trigger)

		expect(onOpenChange).not.toHaveBeenCalled()

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})
})
