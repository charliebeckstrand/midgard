import { Activity } from 'react'
import { describe, expect, it } from 'vitest'
import { Drawer, DrawerPanel } from '../../../components/drawer'
import { Sheet, SheetPanel } from '../../../components/sheet'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * The overlay that opened last stays on top after a hide and a reveal.
 *
 * Two overlays share one rung of the `sou` ladder, so the DOM order of their
 * portal nodes decides which one paints on top. A reveal appends each node
 * again, in the order of the React tree. Here the drawer comes first in the
 * tree and opens second, as the edit form of an app does over its list.
 *
 * Here rather than in a jsdom project, because those mock `@floating-ui/react`,
 * and the mock renders the portal in place. The node that moves does not exist
 * there.
 */
function Harness({ hidden, drawer }: { hidden: boolean; drawer: boolean }) {
	return (
		<Activity mode={hidden ? 'hidden' : 'visible'}>
			<Drawer open={drawer} onOpenChange={() => {}}>
				<DrawerPanel aria-label="Edit">
					<button type="button">Save</button>
				</DrawerPanel>
			</Drawer>

			<Sheet open onOpenChange={() => {}}>
				<SheetPanel aria-label="List">
					<button type="button">Row</button>
				</SheetPanel>
			</Sheet>
		</Activity>
	)
}

/** The data slots of the open panels, in DOM order. */
function panelOrder(): (string | null)[] {
	return [...document.querySelectorAll('[data-slot="sheet"], [data-slot="drawer"]')].map((panel) =>
		panel.getAttribute('data-slot'),
	)
}

/** Whether `element` or an ancestor of it is inert or hidden from assistive technology. */
function sealed(element: Element): boolean {
	return element.closest('[inert], [aria-hidden="true"]') !== null
}

describe('overlay stack across a reveal (real browser)', () => {
	it('keeps the overlay that opened last on top, and live', async () => {
		const { rerender } = renderUI(<Harness hidden={false} drawer={false} />)

		await waitFor(() => screen.getByRole('dialog', { name: 'List' }))

		rerender(<Harness hidden={false} drawer />)

		await waitFor(() => expect(panelOrder()).toEqual(['sheet', 'drawer']))

		rerender(<Harness hidden drawer />)

		await waitFor(() => expect(panelOrder()).toEqual([]))

		rerender(<Harness hidden={false} drawer />)

		await waitFor(() => expect(panelOrder()).toEqual(['sheet', 'drawer']))

		const save = screen.getByText('Save')

		const row = screen.getByText('Row')

		// The drawer takes input, and the sheet under it does not.
		expect(sealed(save)).toBe(false)

		expect(sealed(row)).toBe(true)
	})
})
