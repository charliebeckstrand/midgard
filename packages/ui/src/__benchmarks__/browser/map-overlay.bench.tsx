/**
 * Mount cost for the map's overlay marks, which the region benches never
 * touch — every other map bench draws geography and no marks at all, so a
 * regression in a mark's own render path was invisible to the suite.
 *
 * The two contenders are the same two hundred dots, drawn the two ways the
 * module offers: one `MapPoint` each, and one `MapPoints` holding all of them.
 * Every `MapPoint` claims its own legend entry, so the singular form pays two
 * hundred registrations — each a state commit that re-sorts the ledger and
 * re-renders the legend — against the plural form's one.
 */

import { describe } from 'vitest'
import { MapPlat } from '../../modules/map/map-plat'
import { MapPoint } from '../../modules/map/map-point'
import { MapPoints } from '../../modules/map/map-points'
import { type Contender, HEIGHT, reactContender, WIDTH } from './contenders'
import { mountBenches, WINDOW } from './harness'
import { LATTICE_DOTS, statesAtlas } from './map-fixtures'

function overlayContenders(): Contender<typeof LATTICE_DOTS>[] {
	return [
		reactContender('ui MapPoints', (dots) => (
			<MapPlat
				aria-label="Bench overlays"
				geography={statesAtlas.topology}
				projection="albers-usa"
				width={WIDTH}
				height={HEIGHT}
			>
				<MapPoints label="Stops" points={dots} />
			</MapPlat>
		)),
		reactContender('ui MapPoint each', (dots) => (
			<MapPlat
				aria-label="Bench overlays"
				geography={statesAtlas.topology}
				projection="albers-usa"
				width={WIDTH}
				height={HEIGHT}
			>
				{dots.map((dot) => (
					<MapPoint key={dot.label} label={dot.label} at={dot.at} detail={dot.detail} />
				))}
			</MapPlat>
		)),
	]
}

describe('mount · map overlays · 200 dots', () => {
	mountBenches(overlayContenders(), LATTICE_DOTS, WINDOW.slow)
})
