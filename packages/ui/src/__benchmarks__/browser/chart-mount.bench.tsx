/**
 * Initial-render cost, side by side per scenario: one full
 * mount-to-painted-DOM plus teardown per iteration, the way the jsdom grid
 * bench times `render` + `cleanup`. Every contender draws the same dataset
 * into the same fixed box with animations off; AG's frame-deferred scene
 * render is awaited so its bar covers actual drawing, not scheduling.
 */

import { bench, describe } from 'vitest'
import { barContenders, type Contender, lineContenders, scatterContenders } from './contenders'
import { makePoints, makeTrend } from './fixtures'

const host = document.createElement('div')

document.body.append(host)

/** The big scenarios see >100ms iterations; a longer window keeps samples up. */
const SLOW = { time: 2_000 }

function mountBenches<D>(contenders: Contender<D>[], data: D, options?: { time: number }) {
	for (const contender of contenders) {
		bench(
			contender.name,
			async () => {
				const chart = await contender.mount(host, data)

				chart.destroy()
			},
			options,
		)
	}
}

describe('mount · line · 100 × 1 series', () => {
	mountBenches(lineContenders(1), makeTrend(100, 1))
})

describe('mount · line · 1,000 × 1 series', () => {
	mountBenches(lineContenders(1), makeTrend(1_000, 1))
})

describe('mount · line · 10,000 × 1 series', () => {
	mountBenches(lineContenders(1), makeTrend(10_000, 1), SLOW)
})

describe('mount · line · 1,000 × 5 series', () => {
	mountBenches(lineContenders(5), makeTrend(1_000, 5), SLOW)
})

describe('mount · bar · 50 × 2 series', () => {
	mountBenches(barContenders(2), makeTrend(50, 2))
})

describe('mount · bar · 500 × 2 series', () => {
	mountBenches(barContenders(2), makeTrend(500, 2), SLOW)
})

describe('mount · scatter · 1,000 points', () => {
	mountBenches(scatterContenders(), makePoints(1_000))
})

describe('mount · scatter · 10,000 points', () => {
	mountBenches(scatterContenders(), makePoints(10_000), SLOW)
})
