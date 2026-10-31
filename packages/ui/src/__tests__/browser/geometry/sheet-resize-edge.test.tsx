import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Sheet, SheetBody, SheetPanel } from '../../../components/sheet'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { openSheet } from '../helpers/open-sheet'
import { holdDir } from '../helpers/root-state'

/**
 * Real-browser check of the edge a sheet stays docked to while a drag resizes it.
 *
 * A `full` sheet floats on an inset from the screen edge on each side. If the
 * recipe states both insets, a dragged width over-constrains the box, and the
 * browser then drops the inset at the end of the line. In a left-to-right page, a right-hand sheet
 * comes away from the right edge and shrinks toward the left. In a
 * right-to-left page, a left-hand sheet does the same thing the other way.
 * jsdom lays nothing out, so only a real browser shows it.
 */

/** How far the case drags the grip toward the middle of the screen, in pixels. */
const STEP = 50

describe('sheet resize edge (real browser)', () => {
	// The `full` step floats on its insets only above `sm`.
	beforeAll(() => page.viewport(1100, 800))

	it.each([
		['right', 'ltr'],
		['left', 'ltr'],
		['right', 'rtl'],
		['left', 'rtl'],
	] as const)(
		'keeps a full %s sheet on its edge as it shrinks, in a %s page',
		async (side, dir) => {
			holdDir(dir)

			// The grip faces the middle of the screen, so a shrink moves it there.
			const toward = side === 'right' ? 1 : -1

			const { panel, dragBy } = await openSheet(
				<Sheet open onOpenChange={() => {}}>
					<SheetPanel handle side={side} width="full" aria-label="Full">
						<SheetBody>Body</SheetBody>
					</SheetPanel>
				</Sheet>,
			)

			const start = panel.getBoundingClientRect()

			const held = await dragBy(toward * STEP, 0)

			const end = panel.getBoundingClientRect()

			// The docked edge holds, and the grip edge follows the pointer.
			expect(end[side]).toBeNear(start[side], HALF_PIXEL)

			expect(end.width).toBeNear(start.width - STEP, HALF_PIXEL)

			await held.release()
		},
	)
})
