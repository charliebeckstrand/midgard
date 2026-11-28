import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { MapPlat, MapPoint } from '../../../modules/map'
import { getSlot, renderUI } from '../../helpers'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

/**
 * The overview inset covers a corner of a zoomed map. The pan goes past those
 * edges of the frame by the ground that the inset covers, so a drag brings a
 * point in that corner into the open, in a real browser.
 *
 * Only a browser can say this. The room comes from the box of the inset, and
 * jsdom lays out no box.
 */
describe('a point under the overview inset', () => {
	it('comes out from under the inset when the view pans to its corner', async () => {
		// The southeast corner of the fixture: at the end of the pan, the fit puts
		// it in the bottom-right corner of the frame, where the inset sits.
		renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400} zoom>
				<MapPoint id="depot" label="Depot" at={[30, 0]} />
			</MapPlat>,
		)

		const zoomIn = page.getByRole('button', { name: 'Zoom in' })

		await userEvent.click(zoomIn)

		await userEvent.click(zoomIn)

		const plot = getSlot(document.body, 'map-plot')

		const box = plot.getBoundingClientRect()

		// Each drag moves the view up and to the left, and starts clear of the
		// inset. Three of them pass the end of the pan.
		for (let drag = 0; drag < 3; drag++) {
			await userEvent.dragAndDrop(plot, plot, {
				sourcePosition: { x: box.width * 0.6, y: box.height * 0.6 },
				targetPosition: { x: 4, y: 4 },
			})
		}

		const inset = getSlot(document.body, 'map-zoom-overview').getBoundingClientRect()

		const dot = getSlot(document.body, 'map-point').getBoundingClientRect()

		// The room is the full reach of the inset on each axis, so the point
		// clears it to the left and above.
		expect(dot.right).toBeLessThanOrEqual(inset.left)

		expect(dot.bottom).toBeLessThanOrEqual(inset.top)
	})

	it('measures the room on the new side when the inset changes corners', async () => {
		// The southwest corner of the fixture, which the inset covers once the
		// zoom buttons move to the left.
		const map = (controls: 'left' | 'right') => (
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				width={400}
				zoom
				zoomControls={controls}
			>
				<MapPoint id="depot" label="Depot" at={[0, 0]} />
			</MapPlat>
		)

		const { rerender } = renderUI(map('right'))

		const zoomIn = page.getByRole('button', { name: 'Zoom in' })

		await userEvent.click(zoomIn)

		await userEvent.click(zoomIn)

		rerender(map('left'))

		const plot = getSlot(document.body, 'map-plot')

		const box = plot.getBoundingClientRect()

		// Each drag moves the view up and to the right, and starts clear of the
		// inset.
		for (let drag = 0; drag < 3; drag++) {
			await userEvent.dragAndDrop(plot, plot, {
				sourcePosition: { x: box.width * 0.4, y: box.height * 0.6 },
				targetPosition: { x: box.width - 4, y: 4 },
			})
		}

		const inset = getSlot(document.body, 'map-zoom-overview').getBoundingClientRect()

		const dot = getSlot(document.body, 'map-point').getBoundingClientRect()

		expect(dot.left).toBeGreaterThanOrEqual(inset.right)

		expect(dot.bottom).toBeLessThanOrEqual(inset.top)
	})
})
