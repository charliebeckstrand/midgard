import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Sheet, SheetBody, SheetHeader, SheetTitle } from '../../components/sheet'
import { frames, getSlot, renderUI } from '../helpers'
import { drag } from './helpers/drag'

/**
 * Real-browser check of the floor on a sheet docked across the screen.
 *
 * A `top` or `bottom` sheet resizes its height. The floor on that axis is the
 * chrome that does not scroll, as on a drawer. A width floor there makes a short
 * sheet jump taller on the first move of a drag. jsdom lays nothing out, so only
 * a real browser shows the jump.
 */

/** How far the case drags the grip, in pixels. */
const STEP = 12

describe('cross-docked sheet resize floor (real browser)', () => {
	// The sheet floats on an inset above `sm`, so the case states a screen above it.
	beforeAll(() => page.viewport(1100, 800))

	it.each([
		['grows', -STEP],
		['shrinks', STEP],
	] as const)('%s a short bottom sheet by the drag, and does not jump', async (_, travel) => {
		renderUI(
			<Sheet open handle side="bottom" onOpenChange={() => {}} aria-label="Short">
				<SheetHeader>
					<SheetTitle>Short</SheetTitle>
				</SheetHeader>

				<SheetBody>
					<div className="h-16">Body</div>
				</SheetBody>
			</Sheet>,
		)

		await frames()

		const panel = getSlot(document.body, 'sheet')

		const handle = getSlot(document.body, 'sheet-handle')

		const start = panel.getBoundingClientRect().height

		// The premise: the sheet is shorter than a width floor.
		expect(start).toBeLessThan(280)

		const grip = handle.getBoundingClientRect()

		const x = grip.left + grip.width / 2

		const y = grip.top + grip.height / 2

		const held = await drag(handle, { x, y }, [{ x, y: y + travel }])

		// A bottom sheet grows as the pointer goes up, so the height moves against
		// the pointer by the same distance.
		expect(panel.getBoundingClientRect().height).toBeCloseTo(start - travel, 0)

		await held.release()
	})
})
