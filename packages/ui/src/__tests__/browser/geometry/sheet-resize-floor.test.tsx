import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Sheet, SheetBody, SheetHeader, SheetPanel, SheetTitle } from '../../../components/sheet'
import { frames, getSlot, renderUI } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { drag } from '../helpers/drag'

/**
 * Real-browser check of the floor of a sheet resize.
 *
 * A `top` or `bottom` sheet resizes its height. The floor on that axis is the
 * chrome that does not scroll, as on a drawer. A width floor there makes a short
 * sheet jump taller on the first move of a drag.
 *
 * A `left` or `right` sheet resizes its width. A `fit` sheet around narrow
 * content can open narrower than the width floor. The floor there makes it jump
 * wider on the first move of a drag. jsdom lays nothing out, so only a real
 * browser shows either jump.
 */

/** How far the case drags the grip, in pixels. */
const STEP = 12

describe('sheet resize floor (real browser)', () => {
	// The sheet floats on an inset above `sm`, so the case states a screen above it.
	beforeAll(() => page.viewport(1100, 800))

	it.each([
		['grows', -STEP],
		['shrinks', STEP],
	] as const)('%s a short bottom sheet by the drag, and does not jump', async (_, travel) => {
		renderUI(
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel handle side="bottom" aria-label="Short">
					<SheetHeader>
						<SheetTitle>Short</SheetTitle>
					</SheetHeader>

					<SheetBody>
						<div className="h-16">Body</div>
					</SheetBody>
				</SheetPanel>
			</Sheet>,
		)

		await frames()

		const panel = getSlot(document.body, 'sheet')

		const handle = getSlot(document.body, 'sheet-handle')

		const start = panel.getBoundingClientRect().height

		// The premise: the sheet is shorter than a width floor.
		expect(start).toBeLessThan(280)

		const { x, y } = getCenter(handle)

		const held = await drag(handle, { x, y }, [{ x, y: y + travel }])

		// A bottom sheet grows as the pointer goes up, so the height moves against
		// the pointer by the same distance.
		expect(panel.getBoundingClientRect().height).toBeNear(start - travel, HALF_PIXEL)

		await held.release()
	})

	it.each([
		// A right-hand sheet grows as the pointer goes left, so the width moves
		// against the pointer by the same distance.
		['grows by the drag', -STEP, STEP],
		// The sheet is already below the width floor, so its own size is the floor.
		['holds its size against a shrink', STEP, 0],
	] as const)('%s on a narrow fit sheet, and does not jump', async (_, travel, change) => {
		renderUI(
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel handle side="right" width="fit" footer={null} aria-label="Narrow">
					<SheetBody>
						<div className="w-32">Body</div>
					</SheetBody>
				</SheetPanel>
			</Sheet>,
		)

		await frames()

		const panel = getSlot(document.body, 'sheet')

		const handle = getSlot(document.body, 'sheet-handle')

		const start = panel.getBoundingClientRect().width

		// The premise: the content makes the sheet narrower than the width floor.
		expect(start).toBeLessThan(280)

		const { x, y } = getCenter(handle)

		const held = await drag(handle, { x, y }, [{ x: x + travel, y }])

		expect(panel.getBoundingClientRect().width).toBeNear(start + change, HALF_PIXEL)

		await held.release()
	})
})
