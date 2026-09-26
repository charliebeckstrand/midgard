import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { act, renderUI } from '../helpers'

/**
 * A parent render with equal data and series must not render the hidden data
 * table again. It must render the frame only once.
 *
 * The table count reads the `rangeKeys` call that keys the table rows. No other
 * chart render asks for the `category` prefix. The frame builds the header on
 * each of its renders, so the header count reads the frame renders. The counts
 * need module mocks, so this suite sits in `boundary/`.
 */
const renders = vi.hoisted(() => ({ table: 0, header: 0 }))

vi.mock('../../utilities', async (importActual) => {
	const actual = await importActual<typeof import('../../utilities')>()

	return {
		...actual,
		rangeKeys: (count: number, prefix: string) => {
			if (prefix === 'category') renders.table++

			return actual.rangeKeys(count, prefix)
		},
	}
})

vi.mock('../../modules/chart/engine/chart-header', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-header')>()

	return {
		...actual,
		ChartHeader: (props: Parameters<typeof actual.ChartHeader>[0]) => {
			renders.header++

			return actual.ChartHeader(props)
		},
	}
})

type Row = { week: string; a: number; b: number }

const DATA: Row[] = Array.from({ length: 50 }, (_, index) => ({
	week: `W${index}`,
	a: index,
	b: 50 - index,
}))

// Stable references, the best case that a consumer can give.
const SERIES: { xKey: 'week'; yKey: 'a' | 'b'; yName: string }[] = [
	{ xKey: 'week', yKey: 'a', yName: 'A' },
	{ xKey: 'week', yKey: 'b', yName: 'B' },
]

const SCATTER_SERIES: { xKey: 'a'; yKey: 'b'; yName: string }[] = [
	{ xKey: 'a', yKey: 'b', yName: 'AB' },
]

const charts = {
	line: () => <LineChart aria-label="L" title="T" data={DATA} series={SERIES} width={400} />,
	bar: () => <BarChart aria-label="B" title="T" data={DATA} series={SERIES} width={400} />,
	scatter: () => (
		<ScatterChart aria-label="S" title="T" data={DATA} series={SCATTER_SERIES} width={400} />
	),
}

/** Mounts a chart, then gives it five parent renders with equal props. */
async function renderFiveTimes(make: () => ReactElement) {
	const { rerender } = renderUI(make())

	await act(async () => {})

	renders.table = 0

	renders.header = 0

	for (let pass = 0; pass < 5; pass++) {
		rerender(make())

		await act(async () => {})
	}
}

describe('chart parent render', () => {
	beforeEach(() => {
		renders.table = 0

		renders.header = 0
	})

	for (const [name, make] of Object.entries(charts)) {
		it(`${name}: holds the hidden data table through a parent render with equal props`, async () => {
			await renderFiveTimes(make)

			expect(renders.table).toBe(0)
		})
	}

	it('renders the frame once for each parent render of an empty chart', async () => {
		await renderFiveTimes(() => (
			<LineChart aria-label="L" title="T" data={[] as Row[]} series={SERIES} width={400} />
		))

		expect(renders.header).toBe(5)
	})

	it('renders the frame once for each parent render, with no deferred table pass', async () => {
		await renderFiveTimes(charts.line)

		expect(renders.header).toBe(5)
	})
})
