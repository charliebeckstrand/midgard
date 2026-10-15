import { useState } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Sheet, SheetBody, SheetPanel } from '../../../components/sheet'
import { frames, getSlot, renderUI } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { drag } from '../helpers/drag'

/**
 * Real-browser check of the ceiling of a sheet that is scoped to a container.
 *
 * The ceiling is the box the sheet docks in, less the inset that the sheet
 * floats on. A container that does not start at the corner of the screen moves
 * the panel's edges away from the screen's. If the inset is measured against
 * the screen, it comes out wrong, and a sheet dragged all the way out runs past
 * the container's far edge. jsdom lays nothing out, so only a real browser
 * shows it.
 */

/** Where the container starts on the screen, and how large it is, in pixels. */
const BOX = { left: 300, top: 40, width: 700, height: 600 }

/** A container away from the corner of the screen, with a sheet scoped to it. */
function Scoped({ side }: { side: 'left' | 'right' }) {
	const [container, setContainer] = useState<HTMLDivElement | null>(null)

	return (
		<div ref={setContainer} style={{ position: 'fixed', ...BOX }}>
			{container ? (
				<Sheet open onOpenChange={() => {}}>
					<SheetPanel handle side={side} container={container} aria-label="Scoped">
						<SheetBody>Body</SheetBody>
					</SheetPanel>
				</Sheet>
			) : null}
		</div>
	)
}

describe('scoped sheet resize ceiling (real browser)', () => {
	// The sheet floats on an inset above `sm`, so the case states a screen above it.
	beforeAll(() => page.viewport(1100, 800))

	it.each([
		['right', -1],
		['left', 1],
	] as const)(
		'keeps a %s sheet dragged all the way out inside its container',
		async (side, toward) => {
			renderUI(<Scoped side={side} />)

			await frames()

			const panel = getSlot(document.body, 'sheet')

			const handle = getSlot(document.body, 'sheet-handle')

			const start = panel.getBoundingClientRect()

			// The inset the sheet floats on, on the edge it is docked to.
			const inset = side === 'right' ? BOX.left + BOX.width - start.right : start.left - BOX.left

			const { x, y } = centerOf(handle)

			// Far past the container's other edge.
			const held = await drag(handle, { x, y }, [{ x: x + toward * 1000, y }])

			const end = panel.getBoundingClientRect()

			// The sheet keeps the same inset on the other edge of the container.
			expect(end.left).toBeNear(BOX.left + inset, HALF_PIXEL)

			expect(end.right).toBeNear(BOX.left + BOX.width - inset, HALF_PIXEL)

			await held.release()
		},
	)
})
