import { describe, expect, it } from 'vitest'
import { Drawer, DrawerPanel } from '../../components/drawer'
import { Sheet, SheetPanel } from '../../components/sheet'
import { frames, renderUI, screen } from '../helpers'

/**
 * A non-modal overlay turns off pointer events on its full-viewport root, so
 * the page under it stays live. The panel must take the pointer again, as a
 * Sheet does. jsdom does no hit test, so the browser checks which element is
 * under a point of the panel.
 */
describe('a non-modal panel', () => {
	it.each([
		[
			'Drawer',
			(children: string) => (
				<Drawer open onOpenChange={() => {}}>
					<DrawerPanel modal={false} aria-label="Panel">
						<button type="button">{children}</button>
					</DrawerPanel>
				</Drawer>
			),
		],
		[
			'Sheet',
			(children: string) => (
				<Sheet open onOpenChange={() => {}}>
					<SheetPanel modal={false} aria-label="Panel">
						<button type="button">{children}</button>
					</SheetPanel>
				</Sheet>
			),
		],
	])('%s takes the pointer', async (_, render) => {
		renderUI(render('Inside'))

		await frames()

		const button = screen.getByRole('button', { name: 'Inside' })

		const box = button.getBoundingClientRect()

		const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)

		expect(hit).toBe(button)
	})
})
