import { describe, expect, it } from 'vitest'
import { Drawer, DrawerPanel } from '../../../components/drawer'
import { renderUI, screen } from '../../helpers'

/**
 * `onOpenComplete` says that the panel is up. A consumer that measures the panel
 * in the callback must find the panel in the DOM.
 *
 * Here because the jsdom projects and the default browser project mock
 * `@floating-ui/react`, and that mock renders `FloatingPortal` inline. The real
 * engine sets its portal node in a layout effect, so the panel mounts on a later
 * commit than the one that opens the drawer.
 */
describe('Drawer onOpenComplete (real portal)', () => {
	it('finds the panel in the DOM when a panel that arrives in place reports', () => {
		const seen: (Element | null)[] = []

		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel
					animateOnMount={false}
					aria-label="Resolve"
					onOpenComplete={() => seen.push(document.querySelector('[data-slot="drawer"]'))}
				>
					content
				</DrawerPanel>
			</Drawer>,
		)

		expect(seen).toEqual([screen.getByRole('dialog')])
	})
})
