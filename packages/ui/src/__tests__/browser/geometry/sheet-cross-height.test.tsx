import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Sheet, SheetBody, SheetHeader, SheetPanel, SheetTitle } from '../../../components/sheet'
import { frames, getSlot, renderUI } from '../../helpers'

/**
 * A `top` or `bottom` sheet spans the width of the screen and takes the height
 * of its content. Content that is taller than the screen must not push the
 * panel off the screen. The panel stops at the screen height, and the body
 * scrolls in the panel.
 */

/** Text that is taller than the screen. */
const LONG = Array.from({ length: 120 }, (_, index) => `Line ${index + 1}`).map((line) => (
	<p key={line}>{line}</p>
))

describe('top and bottom sheet height (real browser)', () => {
	beforeAll(() => page.viewport(1100, 600))

	for (const side of ['top', 'bottom'] as const) {
		it(`keeps a tall ${side} sheet in the screen, and scrolls its body`, async () => {
			renderUI(
				<Sheet open onOpenChange={() => {}}>
					<SheetPanel side={side}>
						<SheetHeader>
							<SheetTitle>Log</SheetTitle>
						</SheetHeader>
						<SheetBody>{LONG}</SheetBody>
					</SheetPanel>
				</Sheet>,
			)

			await frames()

			const panel = getSlot(document.body, 'sheet')

			const box = panel.getBoundingClientRect()

			expect(box.top).toBeGreaterThanOrEqual(-1)

			expect(box.bottom).toBeLessThanOrEqual(window.innerHeight + 1)

			const body = getSlot(panel, 'sheet-body')

			expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
		})
	}
})
