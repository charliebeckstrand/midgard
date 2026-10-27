import { fireEvent } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import {
	BAR_SHRINK,
	LINE_UNDRAW,
	POINT_UNPOP,
	REFERENCE_FALL,
} from '../../modules/chart/engine/chart-motion'
import { LineChart } from '../../modules/chart/line-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { allBySlot, renderUI, stubMatchMedia } from '../helpers'
import { it } from '../helpers/fake-clock'

/**
 * The layout hold of a legend toggle. A hidden series or reference rule plays
 * its exit, and the rest of the chart keeps its place until the exit ends. Then
 * the layout closes the gap. `motion/react` is mocked here, so a hidden series
 * or rule leaves the DOM at once, and no exit frame plays. The real exit runs in the `motion` browser
 * project (`chart-series-exit.test.tsx`).
 */

const DATA = [
	{ quarter: 'Q1', north: 32, south: 24, west: 18 },
	{ quarter: 'Q2', north: 40, south: 28, west: 22 },
	{ quarter: 'Q3', north: 38, south: 35, west: 20 },
]

const SERIES = [
	{ xKey: 'quarter', yKey: 'north', yName: 'North' },
	{ xKey: 'quarter', yKey: 'south', yName: 'South' },
	{ xKey: 'quarter', yKey: 'west', yName: 'West' },
] as const

function bars(extra: {
	animate?: boolean
	onHiddenChange?: (hidden: ReadonlySet<number>) => void
}) {
	return (
		<BarChart
			aria-label="Sales by quarter"
			data={DATA}
			series={[...SERIES]}
			width={400}
			stacked
			animate={extra.animate ?? true}
			onHiddenChange={extra.onHiddenChange}
		/>
	)
}

/** The `d` of each drawn bar, in draw order: series by series. */
function barPaths(container: HTMLElement): string[] {
	return allBySlot(container, 'chart-bar').map((bar) => bar.getAttribute('d') ?? '')
}

/**
 * The animated bars joined into one path for each series, as the static chart
 * draws them: one bar for each quarter.
 */
function seriesPaths(container: HTMLElement): string[] {
	const paths = barPaths(container)

	return Array.from({ length: paths.length / DATA.length }, (_, series) =>
		paths.slice(series * DATA.length, (series + 1) * DATA.length).join(' '),
	)
}

/** The legend switch of a series. */
function legendItem(container: HTMLElement, name: string): HTMLElement {
	const item = allBySlot(container, 'chart-legend-item').find((button) =>
		button.textContent?.includes(name),
	)

	if (!item) throw new Error(`expected the legend item ${name}`)

	return item
}

/** The series paths of a static chart with `South` toggled off: where the layout lands. */
function settledPaths(): string[] {
	const { container } = renderUI(bars({ animate: false }))

	fireEvent.click(legendItem(container, 'South'))

	return barPaths(container)
}

describe('legend toggle layout hold', () => {
	it('holds the place of a hidden series until its bars shrink', async ({ clock }) => {
		const { container } = renderUI(bars({}))

		const before = barPaths(container)

		fireEvent.click(legendItem(container, 'South'))

		// The legend switch flips at once.
		expect(legendItem(container, 'South').getAttribute('aria-pressed')).toBe('false')

		// The South bars leave, and North and West keep their place in the stack.
		expect(barPaths(container)).toEqual([...before.slice(0, 3), ...before.slice(6)])

		await clock.advance(BAR_SHRINK.duration * 1000 - 1)

		expect(barPaths(container)).toEqual([...before.slice(0, 3), ...before.slice(6)])

		await clock.advance(1)

		// West drops onto North, as a static chart lays it out.
		expect(seriesPaths(container)).toEqual(settledPaths())
	})

	it('reports the hidden set at once', async ({ clock }) => {
		const onHiddenChange = vi.fn()

		const { container } = renderUI(bars({ onHiddenChange }))

		fireEvent.click(legendItem(container, 'South'))

		expect(onHiddenChange).toHaveBeenLastCalledWith(new Set([1]))

		await clock.advance(BAR_SHRINK.duration * 1000)

		expect(onHiddenChange).toHaveBeenCalledTimes(1)
	})

	it('lays out a show at once', async ({ clock }) => {
		const { container } = renderUI(bars({}))

		const before = barPaths(container)

		fireEvent.click(legendItem(container, 'South'))

		await clock.advance(BAR_SHRINK.duration * 1000)

		fireEvent.click(legendItem(container, 'South'))

		expect(barPaths(container)).toEqual(before)
	})

	it('lays out a show during the hold at once', () => {
		const { container } = renderUI(bars({}))

		const before = barPaths(container)

		fireEvent.click(legendItem(container, 'South'))

		fireEvent.click(legendItem(container, 'South'))

		expect(barPaths(container)).toEqual(before)
	})

	it('starts the hold again on a second hide', async ({ clock }) => {
		const { container } = renderUI(bars({}))

		const before = barPaths(container)

		fireEvent.click(legendItem(container, 'South'))

		await clock.advance(BAR_SHRINK.duration * 500)

		fireEvent.click(legendItem(container, 'West'))

		await clock.advance(BAR_SHRINK.duration * 500)

		// North still stands in the stack that held all three series.
		expect(barPaths(container)).toEqual(before.slice(0, 3))

		await clock.advance(BAR_SHRINK.duration * 500)

		// North alone fills the axis now.
		expect(barPaths(container)).not.toEqual(before.slice(0, 3))
	})

	it('lays out at once on a static chart', () => {
		const { container } = renderUI(bars({ animate: false }))

		const before = barPaths(container)

		fireEvent.click(legendItem(container, 'South'))

		expect(barPaths(container)).not.toEqual([...before.slice(0, 3), ...before.slice(6)])
	})

	it('lays out at once under a reduced-motion preference', () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		const { container } = renderUI(bars({}))

		fireEvent.click(legendItem(container, 'South'))

		expect(seriesPaths(container)).toEqual(settledPaths())
	})

	it('holds a line chart for the stroke to un-draw', async ({ clock }) => {
		const { container } = renderUI(
			<LineChart
				aria-label="Sales by quarter"
				data={DATA}
				series={[...SERIES]}
				width={400}
				animate
			/>,
		)

		const lines = () => allBySlot(container, 'chart-line').map((line) => line.getAttribute('d'))

		const before = lines()

		// North sets the top of the scale.
		fireEvent.click(legendItem(container, 'North'))

		expect(lines()).toEqual(before.slice(1))

		await clock.advance(LINE_UNDRAW.duration * 1000)

		expect(lines()).not.toEqual(before.slice(1))
	})

	it('holds a scatter chart for the discs to pop out', async ({ clock }) => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Sales against reach"
				data={DATA}
				series={[
					{ xKey: 'south', yKey: 'west', yName: 'West' },
					{ xKey: 'south', yKey: 'north', yName: 'North' },
				]}
				width={400}
				animate
			/>,
		)

		const discs = () =>
			allBySlot(container, 'chart-scatter-point').map((disc) => disc.getAttribute('cy'))

		const before = discs()

		// North sets the top of the y scale.
		fireEvent.click(legendItem(container, 'North'))

		expect(discs()).toEqual(before.slice(0, 3))

		await clock.advance(POINT_UNPOP.duration * 1000)

		expect(discs()).not.toEqual(before.slice(0, 3))
	})
})

describe('reference toggle layout hold', () => {
	/** A chart whose `Margin` rule sets the top of the value axis. */
	function margin(animate = true) {
		return renderUI(
			<BarChart
				aria-label="Sales by quarter"
				data={DATA}
				series={[...SERIES]}
				width={400}
				reference={[{ value: 80, label: 'Margin' }]}
				animate={animate}
			/>,
		)
	}

	function chip(container: HTMLElement): HTMLElement {
		const item = allBySlot(container, 'chart-legend-reference')[0]

		if (!item) throw new Error('expected the Margin chip')

		return item
	}

	it('holds the scale of a hidden rule until it falls', async ({ clock }) => {
		const { container } = margin()

		const before = barPaths(container)

		fireEvent.click(chip(container))

		// The rule leaves, and the bars keep the scale that the rule set.
		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(0)

		expect(barPaths(container)).toEqual(before)

		await clock.advance(REFERENCE_FALL.duration * 1000 - 1)

		expect(barPaths(container)).toEqual(before)

		await clock.advance(1)

		// The bars grow into the axis that the rule no longer stretches.
		expect(barPaths(container)).not.toEqual(before)
	})

	it('lays out at once on a static chart', () => {
		const { container } = margin(false)

		const before = barPaths(container)

		fireEvent.click(chip(container))

		expect(barPaths(container)).not.toEqual(before)
	})
})
