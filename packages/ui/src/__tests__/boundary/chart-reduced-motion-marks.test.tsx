import type { ElementType } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Sparkline } from '../../components/sparkline'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { renderUI, stubMatchMedia } from '../helpers'

/**
 * A reduced-motion reader gets the line, scatter, pie and sparkline marks at
 * rest on mount.
 *
 * The reduced-motion config of motion skips a transform, but the line draw
 * (`pathLength`) and the point pop (`r`) are no transform. The marks therefore
 * must skip their `initial` state themselves. Motion writes the SVG values
 * after the render, so jsdom cannot read them. The suite reads the `initial`
 * prop that each `motion` element takes instead, keyed by its slot. It needs a
 * module mock, so it sits in `boundary/`.
 */
const initials = vi.hoisted(() => new Map<string, unknown[]>())

vi.mock('motion/react-m', async (importActual) => {
	const actual = await importActual<typeof import('motion/react-m')>()

	const { createElement } = await import('react')

	// One wrapper for each tag, so each element keeps its component identity.
	return Object.fromEntries(
		(Object.entries(actual) as [string, ElementType][]).map(([tag, real]) => [
			tag,
			tag === 'create'
				? real
				: (props: Record<string, unknown>) => {
						const slot = String(props['data-slot'] ?? tag)

						initials.set(slot, [...(initials.get(slot) ?? []), props.initial])

						return createElement(real, props)
					},
		]),
	)
})

const DATA = [
	{ q: 'Q1', v: 10 },
	{ q: 'Q2', v: 30 },
	{ q: 'Q3', v: 20 },
]

function chart() {
	return (
		<LineChart
			aria-label="Revenue"
			data={DATA}
			series={[{ xKey: 'q', yKey: 'v', yName: 'Revenue' }]}
			width={400}
			animate
			points
		/>
	)
}

describe('animated line marks under reduced motion', () => {
	it('mounts the stroke and the points at rest', () => {
		initials.clear()

		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		renderUI(chart())

		// The count is live, so the checks below can fail.
		expect(initials.get('chart-point')?.length).toBeGreaterThan(0)

		expect(initials.get('chart-point')?.at(-1)).toBe(false)

		expect(initials.get('chart-line')?.at(-1)).toBe(false)
	})

	it('keeps the reveal for a reader who does not ask for reduced motion', () => {
		initials.clear()

		stubMatchMedia(() => false)

		renderUI(chart())

		expect(initials.get('chart-point')?.at(-1)).toEqual({ r: 0, opacity: 0 })

		expect(initials.get('chart-line')?.at(-1)).toEqual({ pathLength: 0 })
	})
})

const POINTS = [
	{ a: 1, b: 10 },
	{ a: 2, b: 30 },
	{ a: 3, b: 20 },
]

const SLICES = [
	{ source: 'Direct', visits: 40 },
	{ source: 'Search', visits: 25 },
]

/** The `r` and `pathLength` keys of every `initial` the marks took. */
function revealKeys() {
	return [...initials.values()]
		.flat()
		.flatMap((initial) =>
			initial && typeof initial === 'object'
				? Object.keys(initial).filter((key) => key === 'r' || key === 'pathLength')
				: [],
		)
}

describe('other animated marks under reduced motion', () => {
	it.each([
		[
			'scatter',
			() => (
				<ScatterChart
					aria-label="Scatter"
					data={POINTS}
					series={[{ xKey: 'a', yKey: 'b', yName: 'B' }]}
					width={400}
					animate
				/>
			),
		],
		[
			'pie sweep',
			() => (
				<PieChart
					aria-label="Pie"
					data={SLICES}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					width={300}
					height={200}
					animate
				/>
			),
		],
		['sparkline', () => <Sparkline data={[1, 4, 2, 8, 5]} aria-label="Trend" animate endPoint />],
	])('mounts the %s at rest', (_name, chart) => {
		initials.clear()

		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		renderUI(chart())

		// The count is live, so the check below can fail.
		expect(initials.size).toBeGreaterThan(0)

		expect(revealKeys()).toEqual([])
	})
})
