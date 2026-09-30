import { describe, expect, it, vi } from 'vitest'
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle } from '../../../components/drawer'
import { frames, getSlot, renderUI } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { drag } from '../helpers/drag'

/**
 * Real-browser check of the pull on a drawer grown to its content.
 *
 * The drawer does not shrink below the height it rests at, which is its
 * content. A drag past that floor moves the whole panel down with the pointer,
 * and a release there closes it. A menu that opens as a sheet is such a drawer.
 * jsdom lays nothing out, so only a real browser shows the height and the
 * position of the panel.
 */

/** How far the case pulls the grip, in pixels. */
const PULL = 40

/** A pull that the release gives back, inside the distance that closes the panel. */
const NUDGE = 4

/** Renders an open `auto` drawer with a handle, a heading, and a short body. */
function renderGrown(onOpenChange: (open: boolean) => void) {
	renderUI(
		<Drawer open handle animateOnMount={false} onOpenChange={onOpenChange} aria-label="Options">
			<DrawerHeader>
				<DrawerTitle>Options</DrawerTitle>
			</DrawerHeader>

			<DrawerBody>
				<div className="h-48">Rows</div>
			</DrawerBody>
		</Drawer>,
	)

	return {
		panel: getSlot(document.body, 'drawer'),
		handle: getSlot(document.body, 'drawer-handle'),
	}
}

describe('grown drawer pull (real browser)', () => {
	it('pulls the panel down at its full height, and closes it on the release', async () => {
		const onOpenChange = vi.fn()

		const { panel, handle } = renderGrown(onOpenChange)

		await frames()

		const rest = panel.getBoundingClientRect()

		const { x, y } = centerOf(handle)

		const held = await drag(handle, { x, y }, [{ x, y: y + PULL }])

		const pulled = panel.getBoundingClientRect()

		// The rows stay in view. Only the position of the panel follows the pointer.
		expect(pulled.height).toBeNear(rest.height, HALF_PIXEL)

		expect(pulled.top - rest.top).toBeNear(PULL, HALF_PIXEL)

		await held.release()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('keeps the panel open on a release back at its floor', async () => {
		const onOpenChange = vi.fn()

		const { panel, handle } = renderGrown(onOpenChange)

		await frames()

		const rest = panel.getBoundingClientRect()

		const { x, y } = centerOf(handle)

		const held = await drag(handle, { x, y }, [
			{ x, y: y + PULL },
			{ x, y: y + NUDGE },
		])

		await held.release()

		expect(onOpenChange).not.toHaveBeenCalled()

		const settled = panel.getBoundingClientRect()

		expect(settled.top).toBeNear(rest.top, HALF_PIXEL)

		expect(settled.height).toBeNear(rest.height, HALF_PIXEL)
	})
})
