import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { MapPlat, type MapZoomControlsPlacement } from '../../../modules/map'
import { bySlot, getSlot, renderUI, screen, waitFor } from '../../helpers'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

/**
 * The zoom buttons of a map, pressed by the browser's own pointer.
 *
 * Only a browser can say this. The buttons sit in a gutter beside the plot,
 * and the plot takes the pointer for a pan and a pick. A real press must reach
 * the button alone: it must not start a pan, and it must not pick a region.
 * jsdom dispatches a click straight at its target, and it does no layout, so
 * it cannot show these failures or the place of the gutter.
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

	it.each<MapZoomControlsPlacement>(['top', 'right', 'bottom', 'left'])(
		'puts the group on the %s side, off the plot',
		async (side) => {
			renderUI(
				<MapPlat
					aria-label="Test map"
					geography={FIXTURE_GEOJSON}
					width={400}
					zoom
					zoomControls={side}
				/>,
			)

			await expect.element(page.getByRole('group', { name: 'Zoom' })).toBeVisible()

			const plot = getSlot(document.body, 'map-plot').getBoundingClientRect()

			const group = getSlot(document.body, 'map-zoom-controls').getBoundingClientRect()

			const placed = {
				top: group.bottom <= plot.top,
				right: group.left >= plot.right,
				bottom: group.top >= plot.bottom,
				left: group.right <= plot.left,
			}

			expect(placed[side]).toBe(true)

			// The group is centered on the plot, on the axis that it runs along.
			const across = side === 'top' || side === 'bottom' ? 'x' : 'y'

			const center = (box: DOMRect) =>
				across === 'x' ? box.x + box.width / 2 : box.y + box.height / 2

			expect(Math.abs(center(group) - center(plot))).toBeLessThan(1)
		},
	)

	it.each<MapZoomControlsPlacement>(['top', 'right', 'bottom', 'left'])(
		'keeps the tooltip of each button off the other buttons, on the %s side',
		async (side) => {
			renderUI(
				<MapPlat
					aria-label="Test map"
					geography={FIXTURE_GEOJSON}
					width={400}
					zoom
					zoomControls={side}
				/>,
			)

			const buttons = [...getSlot(document.body, 'map-zoom-controls').querySelectorAll('button')]

			// A hover tooltip takes the pointer (WCAG 2.2 SC 1.4.13). A panel on a
			// button next to its trigger thus takes the press that the reader aims at
			// that button.
			for (const button of buttons) {
				await userEvent.hover(button)

				const panel = (await screen.findByRole('tooltip')).getBoundingClientRect()

				for (const other of buttons) {
					if (other === button) continue

					const box = other.getBoundingClientRect()

					const overlaps =
						panel.left < box.right &&
						box.left < panel.right &&
						panel.top < box.bottom &&
						box.top < panel.bottom

					expect(overlaps, `${button.ariaLabel} over ${other.ariaLabel}`).toBe(false)
				}

				await userEvent.unhover(button)

				await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
			}
		},
	)

	it('keeps the ratio of the geography on a `fill` plot of auto height', async () => {
		/** The width over the height of the plot of a `fill` map in a box of auto height. */
		function ratio(zoom: boolean): number {
			const { container, unmount } = renderUI(
				<div style={{ width: 400 }}>
					<MapPlat
						aria-label="Test map"
						geography={FIXTURE_GEOJSON}
						aspectRatio={false}
						zoom={zoom}
					/>
				</div>,
			)

			const box = getSlot(container, 'map-plot').getBoundingClientRect()

			unmount()

			return box.width / box.height
		}

		// The gutter takes a share of the width. The plot keeps the ratio, so it is
		// shorter, and the drawing shows no empty band above or below it.
		expect(ratio(true)).toBeCloseTo(ratio(false), 2)
	})
})
