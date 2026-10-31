// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { BarChart } from '../../modules/chart/bar-chart'
import { HeatmapChart } from '../../modules/chart/heatmap-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'

/**
 * The server markup of the animated chart marks that grow, fade, wipe, or
 * slide in.
 *
 * The server cannot read the reduced-motion preference of the reader, so these
 * marks render at rest there, as the lines and the points do. A mark at its
 * `initial` state stays hidden, clipped, scaled to zero, or out of place until
 * the motion features load in the browser. The suite renders with the real motion,
 * so it sits in the node project, which has no module doubles.
 */
const DATA = [
	{ q: 'Q1', v: 10 },
	{ q: 'Q2', v: 30 },
	{ q: 'Q3', v: 20 },
]

const BOX = { width: 400, height: 240, animate: true } as const

/**
 * The opening tags in `markup` that match `tag`. A tag with a capture group
 * gives the group: the motion wrapper that has no slot of its own.
 */
function tags(markup: string, tag: RegExp): string[] {
	return [...markup.matchAll(tag)].map((match) => match[1] ?? match[0])
}

/** The tags that hold an `initial` state: hidden, clipped to zero, or moved off. */
const AT_INITIAL = /opacity:0|scale[XY]\(0\)|translate[XY]\((?!0px)[^)]*\)/

describe('animated chart server markup', () => {
	it.each([
		[
			'vertical bars',
			() => (
				<BarChart
					aria-label="Revenue"
					data={DATA}
					series={[{ xKey: 'q', yKey: 'v' }]}
					orientation="vertical"
					{...BOX}
				/>
			),
			/<path[^>]*data-slot="chart-bar"[^>]*>/g,
		],
		[
			'horizontal bars',
			() => (
				<BarChart
					aria-label="Revenue"
					data={DATA}
					series={[{ xKey: 'q', yKey: 'v' }]}
					orientation="horizontal"
					{...BOX}
				/>
			),
			/<path[^>]*data-slot="chart-bar"[^>]*>/g,
		],
		[
			'area wash',
			() => (
				<AreaChart aria-label="Revenue" data={DATA} series={[{ xKey: 'q', yKey: 'v' }]} {...BOX} />
			),
			/<path[^>]*data-slot="chart-area"[^>]*>/g,
		],
		[
			'value labels',
			() => (
				<LineChart
					aria-label="Revenue"
					data={DATA}
					series={[{ xKey: 'q', yKey: 'v' }]}
					labels={{ endpoints: true, extremes: true }}
					{...BOX}
				/>
			),
			/<text[^>]*data-slot="chart-value-label"[^>]*>/g,
		],
		[
			'dashed line wipe',
			() => (
				<LineChart
					aria-label="Revenue"
					data={DATA}
					series={[{ xKey: 'q', yKey: 'v', dashed: true }]}
					{...BOX}
				/>
			),
			/<clipPath[^>]*data-slot="chart-line-wipe"[^>]*><rect[^>]*>/g,
		],
		[
			'reference rule',
			() => (
				<LineChart
					aria-label="Revenue"
					data={DATA}
					series={[{ xKey: 'q', yKey: 'v' }]}
					reference={[{ value: 25, label: 'Goal' }]}
					{...BOX}
				/>
			),
			// The rise wraps the stroke inside the group of the rule.
			/data-slot="chart-reference-line"[^>]*>(<g[^>]*>)/g,
		],
		[
			'segment labels',
			() => (
				<PieChart
					aria-label="Revenue"
					data={DATA}
					series={[{ xKey: 'q', yKey: 'v' }]}
					labels={{ segment: true }}
					{...BOX}
				/>
			),
			/<text[^>]*data-slot="chart-segment-label"[^>]*>/g,
		],
		[
			'callouts',
			() => (
				<PieChart
					aria-label="Revenue"
					data={DATA}
					series={[{ xKey: 'q', yKey: 'v' }]}
					labels={{ callouts: true }}
					{...BOX}
					// The callouts draw from 480 px wide and up.
					width={480}
				/>
			),
			// The fade wraps the leader and the label of each callout.
			/(<g[^>]*>)<polyline[^>]*data-slot="chart-callout-leader"/g,
		],
	])('renders the %s at rest', (_name, chart, tag) => {
		const found = tags(renderToString(chart()), tag)

		// The count is live, so the check below can fail.
		expect(found.length).toBeGreaterThan(0)

		expect(found.filter((markup) => AT_INITIAL.test(markup))).toEqual([])
	})

	it('renders the heatmap colors at rest, not the neutral that a wash starts from', () => {
		const markup = renderToString(
			<HeatmapChart
				aria-label="Commits"
				data={[
					{ day: 'Mon', hour: '9', commits: 1 },
					{ day: 'Mon', hour: '10', commits: 9 },
				]}
				series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: ['#fff', '#000'] }]}
				{...BOX}
			/>,
		)

		const grid = markup.match(/data-slot="heatmap-cells">(.*?)<\/g>/)?.[1] ?? ''

		const cells = tags(grid, /<rect[^>]*>/g)

		// The count is live, so the check below can fail.
		expect(cells).toHaveLength(2)

		expect(cells.filter((rect) => !/ fill="/.test(rect) || rect.includes('fill-zinc-100'))).toEqual(
			[],
		)
	})
})
