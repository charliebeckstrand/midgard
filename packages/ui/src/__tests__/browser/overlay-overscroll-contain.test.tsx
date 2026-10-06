import { describe, expect, it } from 'vitest'
import { Confirm } from '../../components/confirm'
import { Dialog, DialogBody, DialogPanel } from '../../components/dialog'
import { Drawer, DrawerBody, DrawerPanel } from '../../components/drawer'
import { Sheet, SheetBody, SheetPanel } from '../../components/sheet'
import { Sidebar, SidebarBody } from '../../components/sidebar'
import { frames, getSlot, renderUI } from '../helpers'

/**
 * A scroll region in an overlay panel keeps its overscroll. When a scroll
 * reaches the end of the region, the scroll does not move on to the page. On
 * iOS, a pull that moves on to a page at its top starts pull-to-refresh, and
 * the reload closes the panel. The mobile sidebar of the docs closed in this
 * way while the reader scrolled its list.
 *
 * Real browser, because the rule is computed style.
 */
describe('a scroll region in an overlay panel', () => {
	it.each([
		[
			'Drawer body',
			'drawer-body',
			<Drawer key="drawer" open onOpenChange={() => {}}>
				<DrawerPanel aria-label="Panel">
					<DrawerBody>Body</DrawerBody>
				</DrawerPanel>
			</Drawer>,
		],
		[
			'Sidebar body in a drawer',
			'sidebar-body',
			<Drawer key="sidebar" open onOpenChange={() => {}}>
				<DrawerPanel aria-label="Panel" footer={null}>
					<Sidebar>
						<SidebarBody>Body</SidebarBody>
					</Sidebar>
				</DrawerPanel>
			</Drawer>,
		],
		[
			'Sheet body',
			'sheet-body',
			<Sheet key="sheet" open onOpenChange={() => {}}>
				<SheetPanel aria-label="Panel">
					<SheetBody>Body</SheetBody>
				</SheetPanel>
			</Sheet>,
		],
		[
			'Dialog body',
			'dialog-body',
			<Dialog key="dialog" open onOpenChange={() => {}}>
				<DialogPanel aria-label="Panel">
					<DialogBody>Body</DialogBody>
				</DialogPanel>
			</Dialog>,
		],
		[
			'Confirm body',
			'confirm-body',
			<Confirm key="confirm" open onOpenChange={() => {}} onConfirm={() => {}}>
				Body
			</Confirm>,
		],
	])('%s keeps its overscroll', async (_, slot, element) => {
		renderUI(element)

		await frames()

		expect(getComputedStyle(getSlot(document.body, slot)).overscrollBehaviorY).toBe('contain')
	})
})
