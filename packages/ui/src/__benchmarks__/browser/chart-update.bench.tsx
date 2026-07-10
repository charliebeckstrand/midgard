/**
 * Redraw cost on a live chart — the dashboard refresh path. Each scenario
 * mounts every contender once (top-level await; the trees stay up for the
 * whole run) and each iteration swaps in the other of two same-shape
 * datasets, so every redraw moves real values and never bails on an
 * equality guard. The ui module re-renders through its React root; AG and
 * Highcharts take their in-place data-update APIs.
 */

import { describe } from 'vitest'
import { barContenders, lineContenders, scatterContenders } from './contenders'
import { makePoints, makeTrend } from './fixtures'
import { prepare, SLOW, updateBenches } from './harness'

const line1k = await prepare(lineContenders(1), makeTrend(1_000, 1, 1), makeTrend(1_000, 1, 2))

const line10k = await prepare(lineContenders(1), makeTrend(10_000, 1, 1), makeTrend(10_000, 1, 2))

const line1k5 = await prepare(lineContenders(5), makeTrend(1_000, 5, 1), makeTrend(1_000, 5, 2))

const bar500 = await prepare(barContenders(2), makeTrend(500, 2, 1), makeTrend(500, 2, 2))

const points10k = await prepare(scatterContenders(), makePoints(10_000, 1), makePoints(10_000, 2))

describe('update · line · 1,000 × 1 series', () => {
	updateBenches(line1k)
})

describe('update · line · 10,000 × 1 series', () => {
	updateBenches(line10k, SLOW)
})

describe('update · line · 1,000 × 5 series', () => {
	updateBenches(line1k5, SLOW)
})

describe('update · bar · 500 × 2 series', () => {
	updateBenches(bar500, SLOW)
})

describe('update · scatter · 10,000 points', () => {
	updateBenches(points10k, SLOW)
})
