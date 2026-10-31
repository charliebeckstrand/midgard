import { describe, expect, it } from 'vitest'
import { Menu, MenuContent, MenuItem } from '../../components/menu'
import { getSlot, renderUI, waitFor } from '../helpers'
import { nextPaint } from '../helpers/frames'
import { fadedEdges } from '../helpers/scroll-fade'

/**
 * Menu scroll edge fade (real layout). The viewport's max-height and the
 * `scroll-fade-block` mask are invisible to jsdom: it reports zero scroll
 * extent, runs no scroll-driven animation, and compiles no Tailwind. Only a
 * real browser proves that an overflowing menu fades the edge with rows behind
 * it, that a scroll moves the fade, and that a panel whose rows fit has no
 * mask.
 *
 * `MenuViewport` is the one component both menu panels render for this, so the
 * fade holds for a submenu panel too.
 */
describe('Menu scroll edge fade (real browser)', () => {
	/**
	 * The scroll viewport of a `count`-row menu, opened `static` so no pointer
	 * work is needed. The cap is opt-in, so a fade case passes `capped`: the rows
	 * only run past an edge while a cap holds the viewport shorter than them.
	 * Omit the flag to render the default menu.
	 */
	function viewportFor(capped?: boolean, count = 12) {
		const { container } = renderUI(
			<Menu defaultOpen capped={capped}>
				<MenuContent aria-label="Actions">
					{Array.from({ length: count }, (_, index) => `Item ${index + 1}`).map((label) => (
						<MenuItem key={label}>{label}</MenuItem>
					))}
				</MenuContent>
			</Menu>,
		)

		return getSlot(container, 'menu-viewport')
	}

	it('moves the fade to the top edge as the viewport scrolls to the bottom', async () => {
		const viewport = viewportFor(true)

		viewport.scrollTop = viewport.scrollHeight

		await waitFor(() => expect(fadedEdges(viewport)).toEqual({ top: true, bottom: false }))
	})

	it('fades both edges in the middle of the scroll', async () => {
		const viewport = viewportFor(true)

		viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2

		await waitFor(() => expect(fadedEdges(viewport)).toEqual({ top: true, bottom: true }))
	})

	// The row counts match the open bench's ladder.
	for (const count of [8, 24, 64]) {
		it(`grows to all ${count} rows uncapped, with no mask`, async () => {
			// The flag is omitted, not passed `false`, so this is the tree a consumer
			// gets by default.
			const viewport = viewportFor(undefined, count)

			await waitFor(() => expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.clientHeight))

			// The scroll timeline of a box that fits is inactive, so no animation
			// sets the mask image.
			expect(getComputedStyle(viewport).maskImage).toBe('none')
		})

		it(`overflows ${count} rows capped and fades the bottom edge`, async () => {
			const viewport = viewportFor(true, count)

			expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)

			// The scroll timeline resolves in the update of the frame, so a read in the
			// commit task is too early. The first paint is what the reader sees.
			await nextPaint()

			expect(fadedEdges(viewport)).toEqual({ top: false, bottom: true })
		})
	}
})
