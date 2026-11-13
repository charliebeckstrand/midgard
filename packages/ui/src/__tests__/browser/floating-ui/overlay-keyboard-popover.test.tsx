import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../../components/drawer'
import { Input } from '../../../components/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { act, getSlot, renderUI, screen } from '../../helpers'

/**
 * A drawer keeps clear of the on-screen keyboard of a field in a popover that
 * opened from it.
 *
 * The box of the overlay follows the visual viewport only while a field in the
 * box has the focus. The popover renders in a portal beside the box, not in
 * it, so the box must count a field in a surface that opened from it. It runs
 * with the real floating-ui, because the suite mock renders the portal in place.
 *
 * Chromium shows no keyboard, so the case sets the height of the visual
 * viewport and sends its `resize`.
 */

const KEYBOARD = 300

describe('drawer with a field in a popover and the on-screen keyboard', () => {
	it('keeps the drawer above the keyboard', async ({ signal }) => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel height="fit" aria-label="Edit">
					<DrawerTitle>Edit</DrawerTitle>
					<DrawerBody>
						<Popover>
							<PopoverTrigger>Color</PopoverTrigger>
							<PopoverContent>
								<Input aria-label="Hex" />
							</PopoverContent>
						</Popover>
					</DrawerBody>
				</DrawerPanel>
			</Drawer>,
		)

		const panel = getSlot(document.body, 'drawer')

		await userEvent.click(await screen.findByRole('button', { name: 'Color' }))

		const field = await screen.findByRole('textbox', { name: 'Hex' })

		signal.throwIfAborted()

		expect(getSlot(document.body, 'overlay').contains(field)).toBe(false)

		act(() => {
			field.focus()
		})

		vi.spyOn(VisualViewport.prototype, 'height', 'get').mockReturnValue(
			window.innerHeight - KEYBOARD,
		)

		act(() => {
			window.visualViewport?.dispatchEvent(new Event('resize'))
		})

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight - KEYBOARD, 0)
	})
})
