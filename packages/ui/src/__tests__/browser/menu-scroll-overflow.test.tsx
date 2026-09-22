import { describe, expect, it } from 'vitest'
import { Menu, MenuContent, MenuItem, MenuSub } from '../../components/menu'
import { fireEvent, getSlot, present, renderUI, screen, waitFor } from '../helpers'

/**
 * Menu scroll-overflow affordance (real layout). The viewport's max-height,
 * the `useScrollOverflow` edge attributes, and the mask fade they open are all
 * invisible to jsdom: it reports zero scroll extent and compiles no Tailwind,
 * so only a real browser proves an overflowing menu stamps the attributes,
 * flips them across a scroll, and resolves the arbitrary-property mask
 * classes to actual CSS. It hides the flip side too: only real layout proves
 * that an uncapped panel grows to all its rows and stamps neither edge.
 *
 * `MenuSub` gates its own watch off the same flag, and its panel portals out of
 * the menu it hangs off. The submenu cases therefore read the same invariant on
 * a second, separately mounted viewport.
 */

/** `count` plain rows, for whichever viewport the case mounts. */
function rows(count: number) {
	return Array.from({ length: count }, (_, index) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: static list
		<MenuItem key={index}>Item {index + 1}</MenuItem>
	))
}

describe('Menu scroll overflow (real browser)', () => {
	/**
	 * The scroll viewport of a `count`-row menu, opened `static` so no pointer
	 * work is needed. The cap is opt-in, so an affordance case passes `capped`:
	 * the rows only run past an edge while a cap holds the viewport shorter
	 * than them. Omit the flag to render the default menu.
	 */
	function viewportFor(capped?: boolean, count = 12) {
		const { container } = renderUI(
			<Menu defaultOpen capped={capped}>
				<MenuContent aria-label="Actions">{rows(count)}</MenuContent>
			</Menu>,
		)

		return getSlot(container, 'menu-viewport')
	}

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

	it('grows to its rows on the default menu, leaving no edge to stamp', async () => {
		// The flag is omitted, not passed `false`, so this is the tree a consumer
		// gets by default. That default is what the gate keys off.
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

describe('MenuSub scroll overflow (real browser)', () => {
	/**
	 * The scroll viewport of a submenu panel, opened by a click on its parent
	 * row. The panel portals out of the enclosing menu, so the viewport is
	 * reached from one of its own rows rather than from the render container.
	 */
	async function submenuViewportFor(capped?: boolean, count = 12) {
		renderUI(
			<Menu defaultOpen capped={capped}>
				<MenuContent aria-label="Actions">
					<MenuSub label="More">{rows(count)}</MenuSub>
				</MenuContent>
			</Menu>,
		)

		fireEvent.click(screen.getByRole('menuitem', { name: /More/ }))

		const first = await waitFor(() => screen.getByRole('menuitem', { name: 'Item 1' }))

		return present(
			first.closest<HTMLElement>('[data-slot="menu-viewport"]'),
			'the submenu [data-slot="menu-viewport"]',
		)
	}

	it('grows to its rows on the default submenu, leaving no edge to stamp', async () => {
		// The flag is omitted, not passed `false`, so this is the tree a consumer
		// gets by default. That default is what the gate keys off.
		const viewport = await submenuViewportFor()

		await waitFor(() => expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.clientHeight))

		expect(viewport).not.toHaveAttribute('data-overflow-above')

		expect(viewport).not.toHaveAttribute('data-overflow-below')
	})

	it('overflows a capped submenu and stamps the below edge', async () => {
		const viewport = await submenuViewportFor(true)

		expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)

		await waitFor(() => expect(viewport).toHaveAttribute('data-overflow-below'))

		expect(viewport).not.toHaveAttribute('data-overflow-above')
	})
})
