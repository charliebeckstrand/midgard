import { describe, expect, it } from 'vitest'
import { Menu, MenuContent, MenuItem } from '../../components/menu'
import { bySlot, renderUI, waitFor } from '../helpers'

/**
 * Menu scroll-overflow affordance (real layout). The viewport's max-height,
 * the `useScrollOverflow` edge attributes, and the mask fade they open are all
 * invisible to jsdom: it reports zero scroll extent and compiles no Tailwind,
 * so only a real browser proves an overflowing menu stamps the attributes,
 * flips them across a scroll, and resolves the arbitrary-property mask
 * classes to actual CSS. It hides the flip side too: only real layout proves
 * that an uncapped panel grows to all its rows and stamps neither edge.
 */
describe('Menu scroll overflow (real browser)', () => {
	/**
	 * The scroll viewport of a `count`-row menu, opened `static` so no pointer
	 * work is needed. The cap is opt-in, so every affordance case passes
	 * `capped`: the rows only run past an edge while a cap holds the viewport
	 * shorter than them.
	 */
	function viewportFor(capped?: boolean, count = 12) {
		const { container } = renderUI(
			<Menu defaultOpen capped={capped}>
				<MenuContent aria-label="Actions">
					{Array.from({ length: count }, (_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static list
						<MenuItem key={index}>Item {index + 1}</MenuItem>
					))}
				</MenuContent>
			</Menu>,
		)

		const viewport = bySlot(container, 'menu-viewport')

		if (!(viewport instanceof HTMLElement)) throw new Error('menu viewport not rendered')

		return viewport
	}

	it('caps the viewport and stamps only the below edge at the top', async () => {
		const viewport = viewportFor(true)

		expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)

		await waitFor(() => expect(viewport).toHaveAttribute('data-overflow-below'))

		expect(viewport).not.toHaveAttribute('data-overflow-above')
	})

	it('flips the edge attributes as the viewport scrolls to the bottom', async () => {
		const viewport = viewportFor(true)

		viewport.scrollTop = viewport.scrollHeight

		await waitFor(() => expect(viewport).toHaveAttribute('data-overflow-above'))

		expect(viewport).not.toHaveAttribute('data-overflow-below')
	})

	it('opens the mask fade on the overflowing edge only', async () => {
		const viewport = viewportFor(true)

		await waitFor(() => expect(viewport).toHaveAttribute('data-overflow-below'))

		const styles = getComputedStyle(viewport)

		// The arbitrary-property utilities must have compiled: the mask gradient
		// exists, the overflowing edge's fade extent is open, and the reached
		// edge's stays collapsed.
		expect(styles.maskImage).toContain('linear-gradient')

		expect(styles.getPropertyValue('--menu-fade-below').trim()).toBe('1.5rem')

		expect(styles.getPropertyValue('--menu-fade-above').trim()).toBe('')
	})

	it('grows to its rows uncapped, leaving no edge to stamp', async () => {
		const viewport = viewportFor()

		// Settle on the geometry rather than on an attribute: the panel fitting
		// its own scroll extent is what leaves nothing to stamp, and the hook
		// clears both edges from that same measurement.
		await waitFor(() => expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.clientHeight))

		expect(viewport).not.toHaveAttribute('data-overflow-below')

		expect(viewport).not.toHaveAttribute('data-overflow-above')
	})

	// The gate `MenuContent` puts on the watch rests on one invariant: an
	// uncapped viewport never overflows, a capped one always does. The row
	// counts match the open bench's ladder, so the test pins the range the
	// finding measured over. See `__benchmarks__/browser/README.md` §Menus.
	for (const count of [8, 24, 64]) {
		it(`fits all ${count} rows uncapped and stamps neither edge`, async () => {
			const viewport = viewportFor(false, count)

			await waitFor(() => expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.clientHeight))

			expect(viewport).not.toHaveAttribute('data-overflow-above')

			expect(viewport).not.toHaveAttribute('data-overflow-below')
		})

		it(`overflows ${count} rows capped and stamps the below edge`, async () => {
			const viewport = viewportFor(true, count)

			expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)

			await waitFor(() => expect(viewport).toHaveAttribute('data-overflow-below'))

			expect(viewport).not.toHaveAttribute('data-overflow-above')
		})
	}
})
