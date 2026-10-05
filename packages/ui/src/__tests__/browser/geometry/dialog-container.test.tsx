import { describe, expect, it } from 'vitest'
import { Dialog, DialogPanel } from '../../../components/dialog'
import { attach, getSlot, renderUI, waitFor } from '../../helpers'

/**
 * A Dialog with a `container` stays in the box of that container. The overlay
 * root is `absolute` in a container. The layout wrapper of the panel must also
 * be `absolute`, because a `fixed` wrapper puts the panel against the viewport.
 */
describe('Dialog in a container', () => {
	it('puts the panel inside the container, not against the viewport', async () => {
		const host = attach(document.createElement('div'))

		host.className = 'relative ms-10 mt-20 h-60 w-72 overflow-hidden'

		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel container={host} aria-label="Scoped">
					<p>Scoped content</p>
				</DialogPanel>
			</Dialog>,
		)

		const panel = getSlot(document.body, 'dialog')

		const frame = host.getBoundingClientRect()

		// The panel slides in from below, so read it once the motion settles.
		await waitFor(() => expect(panel.getBoundingClientRect().bottom).toBe(frame.bottom))

		expect(frame).toContainBox(panel.getBoundingClientRect())
	})
})
