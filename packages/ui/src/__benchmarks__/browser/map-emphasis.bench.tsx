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

import { bench, describe } from 'vitest'
import { ecZoneEmphasisChart, zoneMapContenders } from './map-contenders'
import { countiesAtlas, makeZones, ZONES } from './map-fixtures'

const frame = () => new Promise(requestAnimationFrame)

async function settle() {
	await frame()

	await frame()
}

type PreparedEmphasis = { name: string; run: () => Promise<void> }

const data = makeZones(countiesAtlas)

/** Row indexes of the emphasised zone — ECharts' highlight target. */
const zoneIndexes = data.rows.flatMap((row, index) => (row.zone === ZONES[0] ? [index] : []))

function pointerPair(target: Element, over: 'over' | 'out') {
	target.dispatchEvent(new PointerEvent(`pointer${over}`, { bubbles: true, pointerType: 'mouse' }))

	target.dispatchEvent(
		new PointerEvent(over === 'over' ? 'pointerenter' : 'pointerleave', { pointerType: 'mouse' }),
	)
}

// One call, positional pick: the ui contender drives the pointer-on-chip
// recede, Highcharts its legend-item hover.
const [ui, hc] = zoneMapContenders(countiesAtlas)

async function prepare(): Promise<PreparedEmphasis[]> {
	const prepared: PreparedEmphasis[] = []

	// ui MapPlat: pointer on its legend switchboard chip.
	{
		const host = document.createElement('div')

		document.body.append(host)

		await (ui as NonNullable<typeof ui>).mount(host, data)

		const chip = host.querySelector('[data-slot="map-legend-item"]') as Element

		prepared.push({
			name: 'ui MapPlat',
			run: async () => {
				pointerPair(chip, 'over')

				await settle()

				pointerPair(chip, 'out')

				await settle()
			},
		})
	}

	// Highcharts: mouse on its data-class legend item; the other points go
	// inactive while it is held.
	{
		const host = document.createElement('div')

		document.body.append(host)

		await (hc as NonNullable<typeof hc>).mount(host, data)

		const item = host.querySelector('.highcharts-legend-item') as Element

		prepared.push({
			name: 'Highcharts map',
			run: async () => {
				item.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

				await settle()

				item.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))

				await settle()
			},
		})
	}

	// ECharts: documented highlight / downplay actions over the zone's rows,
	// with emphasis.focus 'self' blurring the rest; zrender's frame flushes
	// inside the settled frames.
	{
		const host = document.createElement('div')

		document.body.append(host)

		const chart = ecZoneEmphasisChart(host, countiesAtlas, data)

		prepared.push({
			name: 'ECharts map',
			run: async () => {
				chart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: zoneIndexes })

				chart.getZr().flush()

				await settle()

				chart.dispatchAction({ type: 'downplay', seriesIndex: 0, dataIndex: zoneIndexes })

				chart.getZr().flush()

				await settle()
			},
		})
	}

	return prepared
}

const contenders = await prepare()

// Sanity, logged once: every contender's recede must actually engage before
// it is timed — a no-op emphasis would score an empty settle.
{
	const pause = () => new Promise((resolve) => setTimeout(resolve, 50))

	const chip = document.querySelector('[data-slot="map-legend-item"]') as Element

	pointerPair(chip, 'over')

	await settle()

	await pause()

	const receded = document
		.querySelector('[data-slot="map-regions-recede"]')
		?.getAttribute('class')
		?.includes('opacity-25')

	pointerPair(chip, 'out')

	await settle()

	const item = document.querySelector('.highcharts-legend-item') as Element

	item.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

	await settle()

	await pause()

	const inactive = document.querySelectorAll('.highcharts-point-inactive').length

	item.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))

	await settle()

	console.log(
		`emphasis sanity: ui receded = ${receded}, hc inactive points while held = ${inactive}`,
	)
}

// An emphasis flip runs tens of milliseconds settled; the longer window keeps
// samples up, matching the hover benches.
const WINDOW = { time: 3_000 }

describe('emphasis · map · counties · isolate zone + release', () => {
	for (const { name, run } of contenders) {
		bench(name, run, WINDOW)
	}
})
