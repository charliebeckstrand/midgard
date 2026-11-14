import { describe, expect, it } from 'vitest'
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetPanel } from '../../../components/sheet'
import { frames, renderUI, screen } from '../../helpers'

/**
 * A sheet on a side has the height of the screen. SheetContent wraps the body
 * and the footer, for example in a form. The wrapper must fill the panel, so a
 * short body leaves the footer at the foot of the panel, as in a Drawer.
 */
describe('SheetContent', () => {
	it('keeps the footer at the foot of a side sheet with a short body', async () => {
		renderUI(
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel side="right" aria-label="Panel">
					<SheetContent>
						<SheetBody>Short</SheetBody>
						<SheetFooter>
							<button type="button">Save</button>
						</SheetFooter>
					</SheetContent>
				</SheetPanel>
			</Sheet>,
		)

		await frames()

		const panel = screen.getByRole('dialog', { name: 'Panel' })
		const footer = screen.getByRole('button', { name: 'Save' }).parentElement as HTMLElement

		// The foot of the content box of the panel: the panel inset stays under the
		// footer, and no more.
		const style = getComputedStyle(panel)
		const foot =
			panel.getBoundingClientRect().bottom -
			Number.parseFloat(style.paddingBottom) -
			Number.parseFloat(style.borderBottomWidth)

		expect(footer.getBoundingClientRect().bottom).toBeNear(foot, 0)
	})
})
