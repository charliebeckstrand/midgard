/**
 * Legend-emphasis cost on a live map: one iteration emphasizes the first
 * category — every region outside it recedes — settles two frames, releases,
 * and settles again. The iteration sends real pointer events to the legend
 * chip of the ui switchboard.
 */

import { describe } from 'vitest'
import { benches, host, type Prepared, settle, WINDOW } from './harness'
import { countiesAtlas, makeZones } from './map-fixtures'
import { zoneMaps } from './maps'

const data = makeZones(countiesAtlas)

/** The pointer pair the ui legend chip listens for; `enter`/`leave` do not bubble. */
function pointerPair(target: Element, over: 'over' | 'out') {
	target.dispatchEvent(new PointerEvent(`pointer${over}`, { bubbles: true, pointerType: 'mouse' }))

	target.dispatchEvent(
		new PointerEvent(over === 'over' ? 'pointerenter' : 'pointerleave', { pointerType: 'mouse' }),
	)
}

/** Mounts the ui zone map and returns the legend chip that it drives. */
async function mountLegend(): Promise<Element> {
	const box = host()

	const [subject] = zoneMaps(countiesAtlas)

	if (!subject) throw new Error('map emphasis bench found no zone map')

	await subject.mount(box, data)

	const chip = box.querySelector('[data-slot="map-legend-item"]')

	if (!chip) throw new Error('map emphasis bench found no legend chip')

	return chip
}

/** One hold-and-release cycle: emphasize, settle, release, settle. */
function cycle(hold: (over: 'over' | 'out') => void) {
	return async () => {
		hold('over')

		await settle()

		hold('out')

		await settle()
	}
}

const chip = await mountLegend()

const prepared: Prepared[] = [{ name: 'ui MapPlat', run: cycle((over) => pointerPair(chip, over)) }]

// Sanity, logged once: the recede must engage before the bench times it,
// because a no-op emphasis would score an empty settle. The pause outwaits the
// transition before the check reads the DOM.
{
	pointerPair(chip, 'over')

	await settle()

	await new Promise((resolve) => setTimeout(resolve, 50))

	const receded = document
		.querySelector('[data-slot="map-regions-recede"]')
		?.getAttribute('class')
		?.includes('opacity-25')

	pointerPair(chip, 'out')

	await settle()

	console.log(`emphasis sanity: ui receded = ${receded}`)
}

describe('emphasis · map · counties · isolate zone + release', () => {
	benches(prepared, WINDOW.settled)
})
