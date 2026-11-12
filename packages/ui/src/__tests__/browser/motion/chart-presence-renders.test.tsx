import { describe, expect, it } from 'vitest'
import { BarChart } from '../../../modules/chart/bar-chart'
import { ScatterChart } from '../../../modules/chart/scatter-chart'
import { act, fireEvent, renderUI, waitFor } from '../../helpers'
import { legendItem } from '../../helpers/chart-legend'
import { componentRenders, motionRenders } from '../helpers/motion-renders'
import { budget } from '../helpers/wall-clock'

/** Long enough for the mount reveal to end. */
const SETTLE = { timeout: budget(3000) }

const CATEGORIES = 30

const DATA = Array.from({ length: CATEGORIES }, (_, index) => ({
	label: `C${index}`,
	north: 10 + (index % 7),
	south: 5 + (index % 5),
}))

const SERIES = [
	{ xKey: 'label', yKey: 'north', yName: 'North' },
	{ xKey: 'label', yKey: 'south', yName: 'South' },
] as const

const POINTS = Array.from({ length: CATEGORIES }, (_, index) => ({
	x: index,
	north: 10 + (index % 7),
	south: 5 + (index % 5),
}))

const SCATTER = [
	{ xKey: 'x', yKey: 'north', yName: 'North' },
	{ xKey: 'x', yKey: 'south', yName: 'South' },
] as const

/** One series list for each render, so a render of the owner changes no prop. */
const SCATTER_SERIES = [...SCATTER]

/**
 * Points at the legend entry of `name`. `act` runs the render of the hover to
 * its commit before it returns.
 */
function pointAt(container: HTMLElement, name: string) {
	fireEvent.pointerOver(legendItem(container, name), {
		pointerType: 'mouse',
		relatedTarget: document.body,
	})
}

/**
 * A legend hover on an animated chart renders only the marks whose dim class
 * changes. Each chart `AnimatePresence` sets `presenceAffectsLayout` to false.
 * Without it, Motion gives each child a new context value on each render of
 * the presence, so each Motion element under it renders past the memo of its
 * mark. The jsdom suites mock Motion, so only a browser run with real Motion
 * can see it.
 */
describe('chart presence renders (real Motion)', () => {
	it('renders only the dimmed bars on a legend hover', async () => {
		const { container } = renderUI(
			<BarChart aria-label="Sales" data={DATA} series={[...SERIES]} width={800} animate />,
		)

		await waitFor(() => {
			expect(container.querySelectorAll('[data-slot="chart-bar"]')).toHaveLength(2 * CATEGORIES)
		}, SETTLE)

		pointAt(container, 'North')

		const renders = motionRenders(container)

		// The South bars dim, so they render, and the walk is live.
		expect(renders).toBeGreaterThan(0)

		// Only they render. Without the flag, each bar of both series renders.
		expect(renders).toBeLessThanOrEqual(CATEGORIES)
	})

	it('renders only the dimmed discs on a legend hover', async () => {
		const { container } = renderUI(
			<ScatterChart aria-label="Points" data={POINTS} series={[...SCATTER]} width={800} animate />,
		)

		await waitFor(() => {
			expect(container.querySelectorAll('[data-slot="chart-legend-item"]').length).toBeGreaterThan(
				0,
			)
		}, SETTLE)

		pointAt(container, 'North')

		const renders = motionRenders(container)

		expect(renders).toBeGreaterThan(0)

		// Only the South discs, which dim, render.
		expect(renders).toBeLessThanOrEqual(CATEGORIES)
	})

	it('renders no bar when the owner of an animated bar chart renders again', async () => {
		// The animated bar layer is a memo, and each bar reads the emphasis
		// itself. Without the memo, a render of the owner renders the layer, its
		// presence, and each bar of both series. The series list is a new literal
		// on each render, as a caller writes it inline.
		const chart = () => (
			<BarChart aria-label="Sales" data={DATA} series={[...SERIES]} width={800} animate />
		)

		const { container, rerender } = renderUI(chart())

		await waitFor(() => {
			expect(container.querySelectorAll('[data-slot="chart-bar"]')).toHaveLength(2 * CATEGORIES)
		}, SETTLE)

		await act(async () => rerender(chart()))

		expect(componentRenders(container, 'AnimatedChartBarMarks')).toBe(0)

		expect(componentRenders(container, 'AnimatedBar')).toBe(0)

		// A legend hover still reaches each bar, past the memo of the layer.
		pointAt(container, 'North')

		expect(componentRenders(container, 'AnimatedBar')).toBe(2 * CATEGORIES)
	})

	it('renders no disc when the owner of a scatter renders again', async () => {
		// The `ReducedMotion` root of the chart hosts its `LazyMotion` in a memo.
		// Without it, the root gives each disc a new context value, so each disc of
		// both series renders.
		const chart = () => (
			<ScatterChart aria-label="Points" data={POINTS} series={SCATTER_SERIES} width={800} animate />
		)

		const { container, rerender } = renderUI(chart())

		await waitFor(() => {
			expect(container.querySelectorAll('[data-slot="chart-legend-item"]').length).toBeGreaterThan(
				0,
			)
		}, SETTLE)

		await act(async () => rerender(chart()))

		expect(motionRenders(container)).toBeLessThan(CATEGORIES)
	})
})
