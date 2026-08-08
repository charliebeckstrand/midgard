/**
 * Legend-emphasis cost on a live map: one iteration emphasises the first
 * category — every region outside it recedes — settles two frames, releases,
 * and settles again. Each contender drives its idiomatic recede: the ui
 * module and Highcharts take real pointer events on their legend UI (the ui
 * switchboard chip; Highcharts' data-class legend item, whose hover sets the
 * other points inactive), while ECharts — whose piecewise visual map draws on
 * canvas, unreachable by a synthetic pointer without brittle pixel targeting —
 * takes its documented `dispatchAction` highlight / downplay with
 * `emphasis.focus: 'self'`, the programmatic form of the same hover link.
 */

import { describe } from 'vitest'
import { benches, host, type Prepared, settle, WINDOW } from './harness'
import { ecZoneEmphasisChart, zoneMapContenders } from './map-contenders'
import { countiesAtlas, makeZones, ZONES } from './map-fixtures'

const data = makeZones(countiesAtlas)

/** Row indexes of the emphasised zone — ECharts' highlight target. */
const zoneIndexes = data.rows.flatMap((row, index) => (row.zone === ZONES[0] ? [index] : []))

/** The pointer pair the ui legend chip listens for; `enter`/`leave` do not bubble. */
function pointerPair(target: Element, over: 'over' | 'out') {
	target.dispatchEvent(new PointerEvent(`pointer${over}`, { bubbles: true, pointerType: 'mouse' }))

	target.dispatchEvent(
		new PointerEvent(over === 'over' ? 'pointerenter' : 'pointerleave', { pointerType: 'mouse' }),
	)
}

/** The mouse pair Highcharts' legend item listens for. */
function mousePair(target: Element, over: 'over' | 'out') {
	target.dispatchEvent(new MouseEvent(`mouse${over}`, { bubbles: true }))
}

/** Mounts a zone contender by index and returns the legend element it drives. */
async function mountLegend(index: number, selector: string): Promise<Element> {
	const box = host()

	const contender = zoneMapContenders(countiesAtlas)[index]

	if (!contender) throw new Error(`map emphasis bench found no contender at ${index}`)

	await contender.mount(box, data)

	return box.querySelector(selector) as Element
}

/** One hold-and-release cycle: emphasise, settle, release, settle. */
function cycle(hold: (over: 'over' | 'out') => void) {
	return async () => {
		hold('over')

		await settle()

		hold('out')

		await settle()
	}
}

// The ui module drives the pointer-on-chip recede; Highcharts its legend-item
// hover; ECharts the programmatic highlight over the zone's rows, with
// emphasis.focus 'self' blurring the rest and zrender flushed into the frames.
const chip = await mountLegend(0, '[data-slot="map-legend-item"]')

const item = await mountLegend(1, '.highcharts-legend-item')

const chart = ecZoneEmphasisChart(host(), countiesAtlas, data)

const contenders: Prepared[] = [
	{ name: 'ui MapPlat', run: cycle((over) => pointerPair(chip, over)) },
	{ name: 'Highcharts map', run: cycle((over) => mousePair(item, over)) },
	{
		name: 'ECharts map',
		run: cycle((over) => {
			chart.dispatchAction({
				type: over === 'over' ? 'highlight' : 'downplay',
				seriesIndex: 0,
				dataIndex: zoneIndexes,
			})

			chart.getZr().flush()
		}),
	},
]

// Sanity, logged once: every contender's recede must actually engage before it
// is timed — a no-op emphasis would score an empty settle. The pause outwaits
// each library's own transition before the DOM is read.
{
	const pause = () => new Promise((resolve) => setTimeout(resolve, 50))

	pointerPair(chip, 'over')

	await settle()

	await pause()

	const receded = document
		.querySelector('[data-slot="map-regions-recede"]')
		?.getAttribute('class')
		?.includes('opacity-25')

	pointerPair(chip, 'out')

	await settle()

	mousePair(item, 'over')

	await settle()

	await pause()

	const inactive = document.querySelectorAll('.highcharts-point-inactive').length

	mousePair(item, 'out')

	await settle()

	console.log(
		`emphasis sanity: ui receded = ${receded}, hc inactive points while held = ${inactive}`,
	)
}

describe('emphasis · map · counties · isolate zone + release', () => {
	benches(contenders, WINDOW.settled)
})
