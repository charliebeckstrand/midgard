import { beforeAll, describe, expect, it, onTestFinished } from 'vitest'
import { page } from 'vitest/browser'
import { Sheet, SheetBody, SheetPanel } from '../../../components/sheet'
import { frames, getSlot, renderUI } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { drag } from '../helpers/drag'

/**
 * Real-browser check of the edge a sheet stays docked to while a drag resizes it.
 *
 * A `full` sheet floats on both its inline insets. A dragged width that leaves
 * both insets set over-constrains the box, and the browser then drops the
 * inset at the end of the line. In a left-to-right page, a right-hand sheet
 * comes away from the right edge and shrinks toward the left. In a
 * right-to-left page, a left-hand sheet does the same thing the other way.
 * jsdom lays nothing out, so only a real browser shows it.
 */

/** How far the case drags the grip toward the middle of the screen, in pixels. */
const STEP = 50

describe('sheet resize edge (real browser)', () => {
	// The `full` step floats on both insets only above `sm`.
	beforeAll(() => page.viewport(1100, 800))

	it.each([
		['right', 'ltr', 1],
		['left', 'ltr', -1],
		['right', 'rtl', 1],
		['left', 'rtl', -1],
	] as const)(
		'keeps a full %s sheet on its edge as it shrinks, in a %s page',
		async (side, dir, toward) => {
			document.documentElement.dir = dir

			onTestFinished(() => document.documentElement.removeAttribute('dir'))

			renderUI(
				<Sheet open onOpenChange={() => {}}>
					<SheetPanel handle side={side} width="full" aria-label="Full">
						<SheetBody>Body</SheetBody>
					</SheetPanel>
				</Sheet>,
			)

			await frames()

			const panel = getSlot(document.body, 'sheet')

			const handle = getSlot(document.body, 'sheet-handle')

			const start = panel.getBoundingClientRect()

			const { x, y } = centerOf(handle)

			const held = await drag(handle, { x, y }, [{ x: x + toward * STEP, y }])

			const end = panel.getBoundingClientRect()

			// The docked edge holds, and the grip edge follows the pointer.
			expect(end[side]).toBeNear(start[side], HALF_PIXEL)

			expect(end.width).toBeNear(start.width - STEP, HALF_PIXEL)

			await held.release()
		},
	)
})
