import { describe, expect, it } from 'vitest'
import { MapGeofence, MapPlat, MapPoint } from '../../../modules/map'
import { POINT_HIT_RADIUS } from '../../../modules/map/engine/map-constants'
import { k } from '../../../recipes/kata/map'
import { getSlot, renderUI } from '../../helpers'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

/**
 * The dot hit target on a coarse pointer, in a real browser. The page has a
 * touch screen, so the media condition of the fine class does not hold, and
 * each dot keeps the whole coarse reach for a finger. A catchment under the dot
 * does not narrow it. `geometry/map-hit-target-modality.test.tsx` holds the
 * narrowed target of a mouse.
 */
describe('dot hit target on a coarse pointer', () => {
	it('keeps the coarse reach under a catchment, where a mouse gets the fine target', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapGeofence label="Catchment" at={[8, 5]} radius={300_000} />

				<MapPoint label="Depot" at={[8, 5]} />
			</MapPlat>,
		)

		const hit = getSlot(container, 'map-point-hit')

		// The fine class is on the target, so only its media condition keeps the reach.
		expect(hit.classList.contains(k.hit.fine.split(' ')[0] ?? '')).toBe(true)

		expect(getComputedStyle(hit).r).toBe(`${POINT_HIT_RADIUS}px`)
	})
})
