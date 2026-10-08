import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Drawer, DrawerContent, DrawerFooter, DrawerPanel } from '../../components/drawer'
import { allBySlot, attach } from '../helpers'

/**
 * The default footer of a panel, under the CSS that an app ships. The base style
 * of `ui/tailwind.css` (`core/panel/base.ts`) hides the default footer while the
 * panel has a Footer slot. The server HTML holds both footers, so the style must
 * decide before hydration, and it must win over the `display` utility of the
 * footer row.
 */
const drawer = (withFooter: boolean) => (
	<Drawer open onOpenChange={() => {}}>
		<DrawerPanel aria-label="Panel">
			<DrawerContent>
				{withFooter ? (
					<form>
						<DrawerFooter>
							<Button type="submit">Save</Button>
						</DrawerFooter>
					</form>
				) : (
					'Body'
				)}
			</DrawerContent>
		</DrawerPanel>
	</Drawer>
)

/** The footer rows of the server HTML of `ui`, with their computed `display`. */
function served(withFooter: boolean) {
	const container = attach(document.createElement('div'))

	container.innerHTML = renderToString(drawer(withFooter))

	return allBySlot(container, 'drawer-footer').map((footer) => ({
		default: footer.dataset.panelFooter === 'default',
		display: getComputedStyle(footer).display,
	}))
}

describe('panel default footer (real CSS)', () => {
	it('hides the default footer in the server HTML of a panel with a nested footer', () => {
		expect(served(true)).toEqual([
			{ default: false, display: 'flex' },
			{ default: true, display: 'none' },
		])
	})

	it('shows the default footer in the server HTML of a panel with no footer', () => {
		expect(served(false)).toEqual([{ default: true, display: 'flex' }])
	})
})
