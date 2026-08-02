// @vitest-environment node

import { bench, describe } from 'vitest'
import { lineGeometry } from '../modules/chart/engine/chart-geometry/line'
import { nearestSeriesLine } from '../modules/chart/engine/chart-hit-test'
import {
	type CartesianLayoutInput,
	horizontalLayout,
	thinned,
	type VisibleValues,
	valueTicksOf,
	verticalLayout,
} from '../modules/chart/engine/chart-layout'
import { bandScale, linearScale } from '../modules/chart/engine/chart-scale'
import { dateCategoryFormat, parseInstant, timeTicks } from '../modules/chart/engine/chart-time'
import { makeDatedTrend, makeTrend } from './browser/fixtures'

/**
 * The chart layer between the scales and the marks: axis layout, tick
 * formatting, date detection, and the pointer hit test. `chart-scale` and
 * `chart-geometry` bench the numbers going in and the paths coming out; this
 * one benches what decides where they go — the pass every mount and every
 * resize frame runs before a single mark is built, plus the scan every pointer
 * move runs after.
 *
 * Node env, no React and no jsdom, so an engine change reads as a core delta
 * the competitive browser suite cannot separate from reconciliation and the
 * DOM commit. Data is the shared LCG fixture the browser suite draws.
 */

const WIDTH = 800

const HEIGHT = 450

/** A layout input over `count` categories of `seriesCount` series, axes on. */
function layoutInput(count: number, seriesCount: number): CartesianLayoutInput {
	const { categories, values } = makeTrend(count, seriesCount)

	const visibleValues: VisibleValues[] = values.map((series, index) => ({
		values: series,
		axis: 'y',
		index,
	}))

	return {
		frameWidth: WIDTH,
		frameHeight: HEIGHT,
		axes: true,
		tickTarget: 5,
		zeroBaseline: true,
		value: { domainValues: values.flat(), format: (value) => value.toFixed(0) },
		categories,
		count,
		visibleValues,
	}
}

describe('chart-layout · cartesian layout (every mount, every resize frame)', () => {
	// The whole pre-mark pass: resolve the value scales against the frame height,
	// size the gutters from the tick labels, decide whether the band labels thin
	// or tilt, then place the plot rect and the snap points. It runs before any
	// geometry is built and again on every resize notification, so its cost sits
	// under every mount and every drag frame in the browser suite.
	for (const count of [100, 1_000, 10_000]) {
		const input = layoutInput(count, 1)

		bench(`${count.toLocaleString()} categories × 1 series · vertical`, () => {
			verticalLayout(input)
		})

		bench(`${count.toLocaleString()} categories × 1 series · horizontal`, () => {
			horizontalLayout(input)
		})
	}

	// A five-series chart pools every series into the domain and carries five
	// snap-point projections per category — the multi-series mount's real shape.
	const wide = layoutInput(1_000, 5)

	bench('1,000 categories × 5 series · vertical', () => {
		verticalLayout(wide)
	})
})

describe('chart-layout · thinned (band label fit)', () => {
	// The category-label decimation the band axis runs whenever labels would
	// collide. It allocates an index array the length of the dataset before
	// filtering it, so it is O(categories) on a chart whose axis can only ever
	// show a few dozen labels.
	for (const count of [1_000, 10_000, 100_000]) {
		bench(`${count.toLocaleString()} categories → ~${Math.floor(WIDTH / 60)} labels`, () => {
			thinned(count, WIDTH, 60)
		})
	}
})

describe('chart-layout · valueTicksOf (Intl format per tick)', () => {
	// Cheap by tick count — five or six — but each label runs the caller's
	// formatter, and a chart resolves ticks for both value axes on every layout.
	const scale = linearScale({
		values: makeTrend(1_000, 1).values.flat(),
		range: [HEIGHT, 0],
		tickTarget: 5,
		zeroBaseline: true,
	})

	if (!scale) throw new Error('fixture yielded no domain')

	const plain = (value: number) => value.toFixed(0)

	const intl = new Intl.NumberFormat('en-US', { notation: 'compact' })

	// Hoisted like `plain`: a closure rebuilt per iteration on one bar only would
	// tilt the pair it is meant to compare.
	const compact = (value: number) => intl.format(value)

	bench('toFixed formatter', () => {
		valueTicksOf(scale, plain)
	})

	bench('Intl.NumberFormat formatter', () => {
		valueTicksOf(scale, compact)
	})
})

describe('chart-time · dateCategoryFormat (the are-these-dates probe)', () => {
	// Runs once per mount over every category. The non-date axis is the common
	// case and exits on its first value; the all-dates axis parses every one.
	// The gap between them is what the early exit saves — and the all-dates bar
	// is what a date-keyed chart still pays, unmeasured until now.
	const labels = makeTrend(10_000, 1).categories

	// The same ISO categories the competitive dated-mount scenario draws, so the
	// core number and the end-to-end number describe one workload.
	const dates = makeDatedTrend(10_000, 1).categories

	for (const count of [1_000, 10_000]) {
		const nonDates = labels.slice(0, count)

		const allDates = dates.slice(0, count)

		bench(`${count.toLocaleString()} categories · non-dates (exits on the first)`, () => {
			dateCategoryFormat(nonDates)
		})

		bench(`${count.toLocaleString()} categories · all dates (parses every one)`, () => {
			dateCategoryFormat(allDates)
		})

		// What the probe answering "yes" commits the mount to. `resolveCategories`
		// labels every row through the resolved formatter, and each call parses the
		// value again and formats it through `Intl` — the axis then thins to a dozen
		// labels, but the gutter estimate measures all of them, so the whole array
		// is built. The probe above is the smaller half of a date axis's cost.
		const format = dateCategoryFormat(allDates)

		if (!format) throw new Error('fixture did not read as dates')

		bench(`${count.toLocaleString()} categories · label every row (Intl per row)`, () => {
			allDates.map(format)
		})
	}
})

describe('chart-time · parseInstant (per value)', () => {
	// The single-value parse behind the probe and the time axis, over the shapes
	// it must tell apart: an epoch number, an ISO string, a Date, and a label
	// that is not a date at all.
	const samples: unknown[] = [
		1_704_067_200_000,
		'2024-01-05T00:00:00.000Z',
		'2024-01-05',
		new Date(2024, 0, 5),
		'P00042',
	]

	bench('mixed value shapes · 5 per iter', () => {
		for (const value of samples) parseInstant(value)
	})
})

describe('chart-time · timeTicks (calendar boundaries on a band axis)', () => {
	// Walks the chosen calendar interval from the first instant to the last,
	// formatting each boundary through `Intl.DateTimeFormat` and interpolating
	// its position between band centers. Resolved once per layout on a
	// date-keyed chart, over the whole row set.
	for (const count of [365, 10_000]) {
		const times = Array.from({ length: count }, (_, index) =>
			new Date(2024, 0, 1 + index).getTime(),
		)

		const band = bandScale({ count, range: [0, WIDTH] })

		bench(`${count.toLocaleString()} rows · daily instants`, () => {
			timeTicks({ times, band, tickTarget: 6, axisLength: WIDTH, locale: 'en-US' })
		})
	}
})

describe('chart-hit-test · nearestSeriesLine (every pointer move)', () => {
	// The scan a line chart runs per `pointermove`: squared point-to-segment
	// distance over every series' every run. The browser hover sweep times it
	// end to end through React; this is the scan alone, where an algorithmic
	// change (a spatial index, an x-bucketed skip) would show first.
	for (const [count, seriesCount] of [
		[1_000, 1],
		[10_000, 1],
		[1_000, 5],
	] as const) {
		const { values } = makeTrend(count, seriesCount)

		const scale = linearScale({
			values: values.flat(),
			range: [HEIGHT, 0],
			tickTarget: 5,
			zeroBaseline: true,
		})

		if (!scale) throw new Error('fixture yielded no domain')

		const band = bandScale({ count, range: [0, WIDTH] })

		const xs = Array.from({ length: count }, (_, index) => band.center(index))

		const seriesRuns = values.map(
			(series) => lineGeometry(series, xs, scale.map, HEIGHT, 'linear').runs,
		)

		const label = `${count.toLocaleString()} pts × ${seriesCount} series`

		// Mid-plot: the scan runs to completion and resolves a hit.
		bench(`${label} · hit`, () => {
			nearestSeriesLine(seriesRuns, WIDTH / 2, HEIGHT / 2)
		})

		// Off every line: no candidate ever beats the tolerance, so the scan pays
		// its full length with nothing to short-circuit on — the worst case, and
		// the one a pointer in the plot's empty upper corner actually hits.
		bench(`${label} · miss`, () => {
			nearestSeriesLine(seriesRuns, WIDTH / 2, -500)
		})
	}
})
