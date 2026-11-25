import { describe, expect, it, vi } from 'vitest'
import { bySlot, fireEvent } from '../helpers'
import { renderNavigable } from '../helpers/map-navigable'
import { categoricalPlat } from '../helpers/map-plat'
import { allRegions } from '../helpers/map-queries'

/** The `d` of each path of the cursor outline, or `null` while it is away. */
function cursorPaths(container: HTMLElement): (string | null)[] | null {
	const cursor = bySlot(container, 'map-region-cursor')

	if (cursor === null) return null

	return Array.from(cursor.querySelectorAll('path'), (path) => path.getAttribute('d'))
}

/**
 * The keyboard cursor outlines the region that it is on (WCAG 2.2 SC 2.4.7).
 * The recede emphasis lights only a region with data, so before this a stop on
 * a region with no data showed nothing.
 */
describe('MapPlat region cursor outline', () => {
	it('outlines the region under the cursor, a region with no data too', () => {
		const { container, plot } = renderNavigable(categoricalPlat({ onRegionClick: vi.fn() }))

		const [alpha, , gamma] = allRegions(container)

		expect(cursorPaths(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const alphaPath = alpha?.getAttribute('d') ?? ''

		expect(cursorPaths(container)).toEqual([alphaPath, alphaPath])

		// Gamma matches no row, so the gated emphasis does not light it.
		fireEvent.keyDown(plot, { key: 'End' })

		const gammaPath = gamma?.getAttribute('d') ?? ''

		expect(cursorPaths(container)).toEqual([gammaPath, gammaPath])

		fireEvent.blur(plot)

		expect(cursorPaths(container)).toBeNull()
	})

	it('shows the outline only while the plot has the keyboard focus, and takes no pointer', () => {
		const { container, plot } = renderNavigable(categoricalPlat())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const cursor = bySlot(container, 'map-region-cursor')

		expect(cursor).toHaveClass('pointer-events-none')

		for (const path of cursor?.querySelectorAll('path') ?? []) {
			expect(path).toHaveClass('invisible', 'in-[[data-slot=map-plot]:focus-visible]:visible')
		}
	})
})
