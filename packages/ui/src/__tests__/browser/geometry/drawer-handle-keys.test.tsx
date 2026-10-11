import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
	Drawer,
	DrawerBody,
	DrawerFooter,
	DrawerPanel,
	DrawerTitle,
} from '../../../components/drawer'
import { frames, getSlot, renderUI } from '../../helpers'
import { settledRect } from '../helpers/sample'

/**
 * The arrow keys on a drawer grip stop at the chrome that does not scroll.
 *
 * A key step eased toward its size, and the next step measured a body still on
 * its way. The floor then fell below the chrome, and a held arrow pushed the
 * footer off the screen. A key step now lands at once.
 *
 * Rides the real browser because jsdom lays nothing out.
 */
describe('drawer grip keys (real browser)', () => {
	it('keeps the footer on the screen under a held arrow', async () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel handle height="half" aria-label="Probe" footer={null}>
					<DrawerTitle>Title</DrawerTitle>
					<DrawerBody>
						<div style={{ height: 2000 }} />
					</DrawerBody>
					<DrawerFooter>
						<button type="button">Save</button>
					</DrawerFooter>
				</DrawerPanel>
			</Drawer>,
		)

		await frames()

		const handle = getSlot(document.body, 'drawer-handle')

		handle.focus()

		await userEvent.keyboard('{ArrowDown>12/}')

		await settledRect(getSlot(document.body, 'drawer'))

		const footer = getSlot(document.body, 'drawer-footer').getBoundingClientRect()

		expect(footer.bottom).toBeLessThanOrEqual(window.innerHeight + 0.5)
	})
})
