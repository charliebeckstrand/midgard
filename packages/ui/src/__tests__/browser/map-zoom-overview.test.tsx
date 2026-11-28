import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { MapPlat } from '../../modules/map'
import { getSlot, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The frame of the view in the overview inset draws whole inside the rounded
 * edge of the inset, in a real browser.
 *
 * Only a browser can say this. jsdom lays out nothing, so it has no box for
 * the inset, its margin, or the stroke. The view can lie on the edge of the
 * thumbnail, and a stroke that is centered on that edge goes half out of the
 * thumbnail. Without the margin of the inset, the inset cuts that half and the
 * corners of the view.
 */
describe('the overview inset of a zoomed map', () => {
	it('draws the whole frame of the view inside its rounded corner', async () => {
		renderUI(<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400} zoom />)

		await userEvent.click(page.getByRole('button', { name: 'Zoom in' }))

		const inset = getSlot(document.body, 'map-zoom-overview')

		const outer = inset.getBoundingClientRect()

		// A press on the top-left corner aims the view there, so the frame of the
		// view lies on the top and the left edges of the thumbnail.
		await userEvent.click(inset, { position: { x: 6, y: 6 } })

		const view = present(inset.querySelector('rect'), 'view frame')

		const frame = view.getBoundingClientRect()

		const half = Number(view.getAttribute('stroke-width')) / 2

		const radius = Number.parseFloat(getComputedStyle(inset).borderTopLeftRadius)

		// The outer corner of the stroke, against the center of the corner arc.
		const corner = { x: frame.left - half, y: frame.top - half }

		const center = { x: outer.left + radius, y: outer.top + radius }

		expect(corner.x).toBeGreaterThanOrEqual(outer.left)

		expect(corner.y).toBeGreaterThanOrEqual(outer.top)

		expect(Math.hypot(center.x - corner.x, center.y - corner.y)).toBeLessThanOrEqual(radius)
	})
})
