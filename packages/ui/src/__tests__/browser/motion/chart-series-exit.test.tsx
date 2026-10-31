import { describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../../modules/chart/bar-chart'
import { MARKER_RADIUS } from '../../../modules/chart/engine/chart-constants'
import { LineChart } from '../../../modules/chart/line-chart'
import { ScatterChart } from '../../../modules/chart/scatter-chart'
import { REDUCED_MOTION_QUERY } from '../../../utilities/media-query'
import { renderUI, stubMatchMedia, waitFor } from '../../helpers'
import { legendItem } from '../../helpers/chart-legend'
import { nextPaint } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/** Long enough for the mount reveal and the exit to end. */
const SETTLE = { timeout: budget(3000) }

const DATA = [
	{ quarter: 'Q1', north: 32, south: 24, west: 18 },
	{ quarter: 'Q2', north: 40, south: 28, west: 22 },
	{ quarter: 'Q3', north: 38, south: 35, west: 20 },
]

const NEXT = [
	{ quarter: 'Q1', north: 12, south: 44, west: 28 },
	{ quarter: 'Q2', north: 20, south: 18, west: 32 },
	{ quarter: 'Q3', north: 48, south: 25, west: 10 },
]

const SERIES = [
	{ xKey: 'quarter', yKey: 'north', yName: 'North' },
	{ xKey: 'quarter', yKey: 'south', yName: 'South' },
	{ xKey: 'quarter', yKey: 'west', yName: 'West' },
] as const

function bars(data = DATA) {
	return (
		<BarChart
			aria-label="Sales by quarter"
			data={data}
			series={[...SERIES]}
			width={400}
			stacked
			animate
		/>
	)
}

/** Every drawn bar, in draw order: series by series. */
function barNodes(container: HTMLElement): SVGPathElement[] {
	return [...container.querySelectorAll<SVGPathElement>('[data-slot="chart-bar"]')]
}

/** The `d` of each drawn bar. */
function barPaths(container: HTMLElement): string[] {
	return barNodes(container).map((bar) => bar.getAttribute('d') ?? '')
}

/** The scale of a bar along the value axis: `1` at rest. */
function barScale(bar: SVGPathElement | undefined): number {
	const scale = bar?.style.transform.match(/scaleY\(([\d.e-]+)\)/)

	return scale ? Number(scale[1]) : 1
}

/** Waits for each bar of a fresh chart to stand at its full height. */
const grown = vi.defineHelper(async (container: HTMLElement, count: number) => {
	await waitFor(() => {
		const nodes = barNodes(container)

		expect(nodes).toHaveLength(count)

		expect(nodes.every((bar) => barScale(bar) === 1)).toBe(true)
	}, SETTLE)
})

/**
 * Real-Motion check of the exit of a hidden series or reference rule. The other
 * suites mock `motion/react`, and the mock removes them at once.
 *
 * Before the fix, a legend toggle removed the marks of a series in one frame.
 * Now they run their reveal in reverse, and the rest of the chart keeps its
 * place until they leave. Then the layout closes the gap.
 */
describe('chart series exit (real Motion)', () => {
	it('shrinks the bars of a hidden series in place, then closes the stack', async () => {
		const { container } = renderUI(bars())

		await grown(container, 9)

		const before = barPaths(container)

		// A frame of the exit: the South bars shrink, and North and West hold still.
		const leaving = await sampleMotionFrames(
			() => barNodes(container),
			(nodes) => nodes.length === 9 && barScale(nodes[3]) < 1 && barScale(nodes[3]) > 0,
			{ during: async () => legendItem(container, 'South').click() },
		)

		expect(leaving.map((bar) => bar.getAttribute('d'))).toEqual(before)

		expect(barScale(leaving[0])).toBe(1)

		expect(barScale(leaving[6])).toBe(1)

		await waitFor(() => expect(barNodes(container)).toHaveLength(6), SETTLE)

		// West drops onto North once South has left.
		await waitFor(() => expect(barPaths(container).slice(3)).not.toEqual(before.slice(6)), SETTLE)
	})

	it('un-draws the stroke of a hidden line', async () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Sales by quarter"
				data={DATA}
				series={[...SERIES]}
				width={400}
				animate
			/>,
		)

		const strokes = () => [
			...container.querySelectorAll<SVGPathElement>('[data-slot="chart-line"]'),
		]

		const drawn = (line: SVGPathElement | undefined) =>
			Number.parseFloat(line?.getAttribute('stroke-dasharray') ?? '1')

		await waitFor(() => {
			expect(strokes()).toHaveLength(3)

			expect(strokes().every((line) => drawn(line) === 1)).toBe(true)
		}, SETTLE)

		const leaving = await sampleMotionFrames(
			strokes,
			(lines) => lines.length === 3 && drawn(lines[1]) < 1 && drawn(lines[1]) > 0,
			{ during: async () => legendItem(container, 'South').click() },
		)

		expect(drawn(leaving[0])).toBe(1)

		await waitFor(() => expect(strokes()).toHaveLength(2), SETTLE)
	})

	it('pops the discs of a hidden scatter series out', async () => {
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

		const discs = () => [
			...container.querySelectorAll<SVGCircleElement>('[data-slot="chart-scatter-point"]'),
		]

		const radius = (disc: SVGCircleElement | undefined) =>
			Number.parseFloat(disc?.getAttribute('r') ?? '0')

		// A plain disc rests at the marker radius.
		const rest = MARKER_RADIUS

		await waitFor(() => {
			expect(discs()).toHaveLength(6)

			expect(discs().every((disc) => radius(disc) === rest)).toBe(true)
		}, SETTLE)

		const leaving = await sampleMotionFrames(
			discs,
			(nodes) => nodes.length === 6 && radius(nodes[3]) < rest && radius(nodes[3]) > 0,
			{ during: async () => legendItem(container, 'North').click() },
		)

		expect(radius(leaving[0])).toBe(rest)

		await waitFor(() => expect(discs()).toHaveLength(3), SETTLE)
	})

	it('drops a hidden reference rule to the baseline, then rescales', async () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Sales by quarter"
				data={DATA}
				series={[...SERIES]}
				width={400}
				reference={[{ value: 80, label: 'Margin' }]}
				animate
			/>,
		)

		const wrapper = () =>
			container.querySelector<SVGGElement>('[data-slot="chart-reference-line"] > g')

		const opacity = (node: SVGGElement | null) =>
			node ? Number.parseFloat(getComputedStyle(node).opacity) : 1

		await grown(container, 9)

		// The rule rests at its value once its rise ends.
		await waitFor(() => expect(wrapper()?.style.transform ?? 'none').toMatch(/^(none|)$/), SETTLE)

		const before = barPaths(container)

		const chip = container.querySelector<HTMLButtonElement>(
			'button[data-slot="chart-legend-reference"]',
		)

		// A frame of the exit: the rule falls and fades, and the bars hold their scale.
		const falling = await sampleMotionFrames(
			() => ({ rule: wrapper(), bars: barPaths(container) }),
			({ rule }) => rule !== null && opacity(rule) < 1 && opacity(rule) > 0,
			{ during: async () => chip?.click() },
		)

		expect(falling.rule?.style.transform).toMatch(/translateY/)

		expect(falling.bars).toEqual(before)

		await waitFor(() => expect(wrapper()).toBeNull(), SETTLE)

		// The bars grow into the axis that the rule no longer stretches.
		await waitFor(() => expect(barPaths(container)).not.toEqual(before), SETTLE)
	})

	it('still shrinks every bar on a data change', async () => {
		const { container, rerender } = renderUI(bars())

		await grown(container, 9)

		// The old generation leaves through the per-series presence: its bars shrink.
		const leaving = await sampleMotionFrames(
			() => barNodes(container),
			(nodes) => nodes.length === 9 && nodes.every((bar) => barScale(bar) < 1 && barScale(bar) > 0),
			{ during: async () => rerender(bars(NEXT)) },
		)

		expect(leaving).toHaveLength(9)

		await grown(container, 9)
	})

	it('lays out at once under reduced motion', async () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		const { container } = renderUI(bars())

		await waitFor(() => expect(barNodes(container)).toHaveLength(9))

		const before = barPaths(container)

		legendItem(container, 'South').click()

		await nextPaint()

		expect(barNodes(container)).toHaveLength(6)

		expect(barPaths(container).slice(3)).not.toEqual(before.slice(6))
	})
})
