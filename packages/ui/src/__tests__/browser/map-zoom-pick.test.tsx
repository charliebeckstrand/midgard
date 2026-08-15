import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { MapPlat, MapPoints } from '../../modules/map'
import { bySlot, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * A zooming plat still answers a pick, in a real browser.
 *
 * Only a browser can say this. The plot takes pointer capture to track a pan,
 * and a captured pointer retargets its own `pointerup` — and the `click` the
 * down/up pair produces — to the capturing element. Capture taken on contact
 * therefore routes every click to the plot itself, and no region or mark ever
 * sees one: the map draws, hovers, and zooms exactly as before, and silently
 * stops opening anything.
 *
 * The input has to be the browser's own — `userEvent` from `vitest/browser`,
 * which drives Playwright — not the DOM-synthesising library of the same name.
 * A synthesised click is dispatched straight at its target, so the retarget the
 * real engine performs never happens and the case passes against the break. That
 * blind spot is shared with jsdom, where `setPointerCapture` is a stub, and it is
 * what let this ship behind a green suite.
 */
describe('picking a zooming map', () => {
	/** A plat that zooms, with a mark and a region that each report a pick. */
	function setup() {
		const onRegionClick = vi.fn()

		const onPointClick = vi.fn()

		renderUI(
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				width={400}
				zoom
				onRegionClick={onRegionClick}
			>
				<MapPoints
					id="points"
					label="Places"
					points={[{ label: 'Depot', at: [8, 5] }]}
					onClick={onPointClick}
				/>
			</MapPlat>,
		)

		return { onRegionClick, onPointClick }
	}

	it('opens a mark the reader clicks', async () => {
		const { onPointClick } = setup()

		await userEvent.click(present(bySlot(document.body, 'map-points-hit'), 'point hit target'))

		expect(onPointClick).toHaveBeenCalled()
	})

	it('opens a region the reader clicks', async () => {
		const { onRegionClick } = setup()

		// The group delegates, so the pick is read off the path the click landed on.
		const region = present(
			bySlot(document.body, 'map-regions')?.querySelector('path'),
			'region path',
		)

		await userEvent.click(region)

		expect(onRegionClick).toHaveBeenCalled()
	})

	it('reports no pick from the click a pan ends on', async () => {
		const { onRegionClick, onPointClick } = setup()

		const plot = present(bySlot(document.body, 'map-plot'), 'plot')

		const box = plot.getBoundingClientRect()

		// Well past the pan threshold, so the press is a pan rather than a shaky
		// pick — which is the whole distinction the click suppression rests on.
		await userEvent.dragAndDrop(plot, plot, {
			sourcePosition: { x: 40, y: 40 },
			targetPosition: { x: box.width - 40, y: box.height - 40 },
		})

		expect(onRegionClick).not.toHaveBeenCalled()

		expect(onPointClick).not.toHaveBeenCalled()
	})
})
