import { describe, expect, it, vi } from 'vitest'
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle } from '../../../components/drawer'
import { frames, getSlot, renderUI, waitFor } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { drag } from '../helpers/drag'

/**
 * Real-browser check of the pull on a drawer grown to its content.
 *
 * The drawer does not resize, because its content sets its height. A drag up
 * on the grip changes nothing. A drag down moves the whole panel with the
 * pointer. A release closes it once a quarter of the panel is off the screen,
 * and a shorter pull springs back. A menu that opens as a sheet is such a
 * drawer. jsdom lays nothing out, so only a real browser shows the height and
 * the position of the panel.
 */

/** How far the case pulls the grip, in pixels. */
const PULL = 40

/** A pull that the release gives back, inside the distance that closes the panel. */
const NUDGE = 4

/**
 * Holds the pointer still for longer than the gesture reads the speed, so the
 * release reads as slow. A drag of a few frames that lets go at once is a flick,
 * and a flick closes the panel at any distance.
 */
function rest(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 150))
}

/** Waits until the panel has no pull, which is where a travel back arrives. */
async function settled(panel: HTMLElement): Promise<void> {
	await waitFor(() => expect(panel.style.translate).toBe(''))
}

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
	it('pulls the panel down at its full height', async () => {
		const { panel, handle } = renderGrown(() => {})

		await frames()

		const home = panel.getBoundingClientRect()

		const { x, y } = centerOf(handle)

		const held = await drag(handle, { x, y }, [{ x, y: y + PULL }])

		const pulled = panel.getBoundingClientRect()

		// The rows stay in view. Only the position of the panel follows the pointer.
		expect(pulled.height).toBeNear(home.height, HALF_PIXEL)

		expect(pulled.top - home.top).toBeNear(PULL, HALF_PIXEL)

		await held.release()
	})

	it('closes on a slow release once a third of the panel is off the screen', async () => {
		const onOpenChange = vi.fn()

		const { panel, handle } = renderGrown(onOpenChange)

		await frames()

		const { x, y } = centerOf(handle)

		const third = panel.getBoundingClientRect().height / 3

		const held = await drag(handle, { x, y }, [{ x, y: y + third }])

		await rest()

		await held.release()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('springs back on a slow release with a sixth of the panel off the screen', async () => {
		const onOpenChange = vi.fn()

		const { panel, handle } = renderGrown(onOpenChange)

		await frames()

		const home = panel.getBoundingClientRect()

		const { x, y } = centerOf(handle)

		const held = await drag(handle, { x, y }, [{ x, y: y + home.height / 6 }])

		await rest()

		await held.release()

		expect(onOpenChange).not.toHaveBeenCalled()

		await settled(panel)

		expect(panel.getBoundingClientRect().top).toBeNear(home.top, HALF_PIXEL)
	})

	it('does not grow the panel on a drag up', async () => {
		const { panel, handle } = renderGrown(() => {})

		await frames()

		const home = panel.getBoundingClientRect()

		const { x, y } = centerOf(handle)

		const held = await drag(handle, { x, y }, [{ x, y: y - PULL }])

		const dragged = panel.getBoundingClientRect()

		// A taller panel only adds empty space under the content.
		expect(dragged.height).toBeNear(home.height, HALF_PIXEL)

		expect(dragged.top).toBeNear(home.top, HALF_PIXEL)

		await held.release()

		expect(panel.style.height).toBe('')
	})

	it('keeps the panel open on a release back at its floor', async () => {
		const onOpenChange = vi.fn()

		const { panel, handle } = renderGrown(onOpenChange)

		await frames()

		const home = panel.getBoundingClientRect()

		const { x, y } = centerOf(handle)

		const held = await drag(handle, { x, y }, [
			{ x, y: y + PULL },
			{ x, y: y + NUDGE },
		])

		await rest()

		await held.release()

		expect(onOpenChange).not.toHaveBeenCalled()

		await settled(panel)

		const back = panel.getBoundingClientRect()

		expect(back.top).toBeNear(home.top, HALF_PIXEL)

		expect(back.height).toBeNear(home.height, HALF_PIXEL)
	})
})
