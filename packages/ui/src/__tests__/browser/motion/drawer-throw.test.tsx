import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle } from '../../../components/drawer'
import { frames, getSlot, renderUI, waitFor } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'
import { drag } from '../helpers/drag'

/**
 * A drawer that a pull closes glides off the screen from where the release left
 * it. A menu that opens as a sheet is such a drawer.
 *
 * The slide of the preset moves the whole panel in 150 ms. After a long pull,
 * most of that travel is already off the screen, so the panel left in a frame
 * or two. The throw travels only the part of the panel that is still on the
 * screen.
 *
 * Real Motion is necessary: the instant mock completes each exit at once.
 */

/**
 * The time after the release at which the case reads the panel, in ms. The
 * slide of the preset has the panel off the screen by then. The throw from a
 * still release is about a third of the way out.
 */
const MIDWAY = 80

/**
 * Holds the pointer still for longer than the gesture reads the speed, so the
 * release reads as slow and the throw starts from rest.
 */
function rest(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 150))
}

/** An `auto` drawer with a handle that closes when it asks to. */
function ClosingDrawer() {
	const [open, setOpen] = useState(true)

	return (
		<Drawer open={open} handle animateOnMount={false} onOpenChange={setOpen} aria-label="Options">
			<DrawerHeader>
				<DrawerTitle>Options</DrawerTitle>
			</DrawerHeader>

			<DrawerBody>
				<div className="h-48">Rows</div>
			</DrawerBody>
		</Drawer>
	)
}

describe('drawer throw (real Motion)', () => {
	it('glides a pulled panel off the screen from where the release left it', async () => {
		renderUI(<ClosingDrawer />)

		const panel = getSlot(document.body, 'drawer')

		const handle = getSlot(document.body, 'drawer-handle')

		await frames()

		const { x, y } = centerOf(handle)

		// Half of the panel is off the screen, which closes it on the release.
		const held = await drag(handle, { x, y }, [{ x, y: y + panel.offsetHeight / 2 }])

		const released = panel.getBoundingClientRect().top

		await rest()

		await held.release()

		await new Promise((resolve) => setTimeout(resolve, MIDWAY))

		const midway = panel.getBoundingClientRect().top

		expect(panel.isConnected).toBe(true)

		expect(midway).toBeGreaterThan(released)

		expect(midway).toBeLessThan(window.innerHeight)

		await waitFor(() => expect(panel.isConnected).toBe(false))
	})
})
