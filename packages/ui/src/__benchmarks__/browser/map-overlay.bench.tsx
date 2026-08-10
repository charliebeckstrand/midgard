/**
 * Mount cost for the map's overlay marks, which the region benches never
 * touch — every other map bench draws geography and no marks at all, so a
 * regression in a mark's own render path was invisible to the suite.
 *
 * The first two contenders are the same two hundred dots, drawn the two ways the
 * module offers: one `MapPoint` each, and one `MapPoints` holding all of them.
 * Every `MapPoint` claims its own legend entry, so the singular form pays two
 * hundred registrations — each a state commit that re-sorts the ledger and
 * re-renders the legend — against the plural form's one.
 *
 * The rest put a drawn zone under those dots, which is the one scene in the
 * module where two marks price each other. A dot on a zone sizes its pointer
 * target against the room that zone can spare, so every dot reads every visible
 * zone once per rebuild — and the suite could not see that at all while its
 * overlay benches drew marks on bare geography. It went unseen once already: the
 * zone's own measure sat inside the per-dot answer, so two hundred dots walked a
 * territory's ~9,900 vertices two hundred times for one figure that never varied.
 *
 * Both zone scenarios detect that, measured by putting it back: the mount runs
 * 23.7ms against 12.9, and the zoom cycle 60.2 against 48.0 — the same ~13ms of
 * one wasted rebuild, read against two different baselines. The mount is the
 * sharper alarm because its baseline is smaller; the zoom is the one that says
 * how often the rebuild happens, and would catch a memo whose dependencies
 * started churning where the mount could not.
 */

import { describe } from 'vitest'
import { MapGeofence } from '../../modules/map/map-geofence'
import { MapPlat } from '../../modules/map/map-plat'
import { MapPoint } from '../../modules/map/map-point'
import { MapPoints } from '../../modules/map/map-points'
import { type Contender, HEIGHT, reactContender, WIDTH } from './contenders'
import { benches, host, mountBenches, type Prepared, settle, WINDOW } from './harness'
import { COVERAGE_AREA, LATTICE_DOTS, statesAtlas } from './map-fixtures'

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

/**
 * The same plural mark with a coverage territory drawn under it. The zone goes
 * first, so the dots draw over it and the wash stays behind them — the order the
 * mark's own docs ask for.
 */
function zonedContenders(): Contender<typeof LATTICE_DOTS>[] {
	return [
		reactContender('ui MapPoints + MapGeofence', (dots) => (
			<MapPlat
				aria-label="Bench overlays"
				geography={statesAtlas.topology}
				projection="albers-usa"
				width={WIDTH}
				height={HEIGHT}
			>
				<MapGeofence label="Coverage" area={COVERAGE_AREA} />

				<MapPoints label="Stops" points={dots} />
			</MapPlat>
		)),
	]
}

/**
 * The zoomable twin, mounted once and driven by the plot's own keyboard: `+`
 * and `-` are the same scale change a wheel notch makes, without the gesture
 * machinery that would put a settle timer inside the sample.
 */
async function zoomPlot(): Promise<Element> {
	const box = host()

	await reactContender('ui MapPoints + MapGeofence, zoomable', (dots: typeof LATTICE_DOTS) => (
		<MapPlat
			aria-label="Bench overlays"
			geography={statesAtlas.topology}
			projection="albers-usa"
			width={WIDTH}
			height={HEIGHT}
			zoom
		>
			<MapGeofence label="Coverage" area={COVERAGE_AREA} />

			<MapPoints label="Stops" points={dots} />
		</MapPlat>
	)).mount(box, LATTICE_DOTS)

	return box.querySelector('[data-slot="map-plot"]') as Element
}

const plot = await zoomPlot()

/** The zoom keypress the plot region listens for. */
function press(key: string) {
	plot.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

/** The transform the zoom layer currently holds — how the sanity check reads a notch. */
function zoomTransform(): string {
	return document.querySelector('[data-slot="map-zoom"]')?.getAttribute('transform') ?? ''
}

const zoomed: Prepared[] = [
	{
		name: 'ui MapPoints + MapGeofence',
		// In and back out, so every iteration starts where the last one ended and
		// the scale never saturates against the ceiling.
		run: async () => {
			press('+')

			await settle()

			press('-')

			await settle()
		},
	},
]

// Sanity, logged once: the notch has to move the view before it is timed, or the
// bench scores two empty settles. Read at rest and while held, then released.
{
	const rest = zoomTransform()

	press('+')

	await settle()

	console.log(
		`zoom sanity: transform moved = ${zoomTransform() !== rest}, zone rings = ${COVERAGE_AREA.length}`,
	)

	press('-')

	await settle()
}

describe('mount · map overlays · 200 dots', () => {
	mountBenches(overlayContenders(), LATTICE_DOTS, WINDOW.slow)
})

describe('mount · map overlays · 200 dots over a coverage zone', () => {
	mountBenches(zonedContenders(), LATTICE_DOTS, WINDOW.slow)
})

describe('zoom · map overlays · 200 dots over a coverage zone · notch in and out', () => {
	benches(zoomed, WINDOW.settled)
})
