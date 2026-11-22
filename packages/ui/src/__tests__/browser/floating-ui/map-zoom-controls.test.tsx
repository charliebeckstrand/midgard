import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { MapPlat } from '../../../modules/map'
import { bySlot, getSlot, renderUI } from '../../helpers'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

/**
 * The zoom buttons of a map, pressed by the browser's own pointer.
 *
 * Only a browser can say this. The buttons sit over the plot, and the plot
 * takes the pointer for a pan and a pick. A real press must reach the button
 * alone: it must not start a pan, and it must not pick the region under the
 * group. jsdom dispatches a click straight at its target, so it cannot show
 * either failure.
 *
 * The case runs with the real floating-ui. The mock renders the panel of each
 * tooltip in the flow, so the focus of a press opens a panel inside the group,
 * and the button moves away from the pointer before the release.
 */
describe('the zoom buttons of a map', () => {
	/** A zooming plat whose regions report a pick. */
	function setup() {
		const onRegionClick = vi.fn()

		renderUI(
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				width={400}
				zoom={2}
				onRegionClick={onRegionClick}
			/>,
		)

		return { onRegionClick }
	}

	/** The scale that the zoom layer draws at. */
	function scale(): number {
		const transform = bySlot(document.body, 'map-zoom')?.getAttribute('transform') ?? ''

		return Number(/scale\(([\d.]+)\)/.exec(transform)?.[1] ?? Number.NaN)
	}

	it('names each button, and the group, in the accessibility tree', async () => {
		setup()

		await expect.element(page.getByRole('group', { name: 'Zoom' })).toBeVisible()

		await expect.element(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()

		await expect.element(page.getByRole('button', { name: 'Zoom out' })).toBeVisible()

		await expect.element(page.getByRole('button', { name: 'Reset zoom' })).toBeVisible()
	})

	it('zooms in, zooms out, and resets from each press, and picks no region', async () => {
		const { onRegionClick } = setup()

		await userEvent.click(page.getByRole('button', { name: 'Zoom in' }))

		await expect.poll(scale).toBeCloseTo(1.6)

		await userEvent.click(page.getByRole('button', { name: 'Zoom out' }))

		await expect.poll(scale).toBe(1)

		await userEvent.click(page.getByRole('button', { name: 'Zoom in' }))

		await userEvent.click(page.getByRole('button', { name: 'Reset zoom' }))

		await expect.poll(scale).toBe(1)

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('keeps the focus on a button that reaches the end of its range', async () => {
		setup()

		const zoomIn = page.getByRole('button', { name: 'Zoom in' })

		await userEvent.click(zoomIn)

		await userEvent.click(zoomIn)

		await expect.poll(scale).toBe(2)

		await expect.element(zoomIn).toHaveAttribute('aria-disabled', 'true')

		await expect.element(zoomIn).toHaveFocus()

		// The press at the end drops. Playwright waits for an `aria-disabled`
		// control to enable, so the press is forced.
		await userEvent.click(zoomIn, { force: true })

		await expect.poll(scale).toBe(2)

		expect(getSlot(document.body, 'map-plot')).not.toHaveFocus()
	})
})
