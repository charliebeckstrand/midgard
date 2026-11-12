import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Swatch } from '../../components/swatch'
import { BarChart } from '../../modules/chart/bar-chart'
import { scatterDiscLayers, scatterMarks } from '../../modules/chart/engine/chart-geometry/scatter'
import { ChartHeader } from '../../modules/chart/engine/chart-header'
import { LegendSwitch } from '../../modules/chart/engine/chart-legend/legend-switch'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { rangeKeys } from '../../utilities/range-keys'
import { act, renderUI } from '../helpers'

/**
 * A parent render with equal data and series must not render the hidden data
 * table again. It must render the frame only once, and no legend entry or
 * reference chip.
 *
 * The table count reads the `rangeKeys` call that keys the table rows. No other
 * chart render asks for the `category` prefix. The frame builds the header on
 * each of its renders, so the header count reads the frame renders. Each series
 * entry renders one `LegendSwitch`, and each series or rule swatch renders one
 * `Swatch`, so those two counts read the legend renders. A scatter chart lays
 * out its discs with `scatterMarks` and draws a plain series with
 * `scatterDiscLayers`, so those two counts read the scatter layout. The counts
 * need module mocks, so this suite sits in `boundary/`.
 */
vi.mock('../../utilities/range-keys', async (importActual) => {
	const actual = await importActual<typeof import('../../utilities/range-keys')>()

	return { ...actual, rangeKeys: vi.fn(actual.rangeKeys) }
})

vi.mock('../../modules/chart/engine/chart-header', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-header')>()

	return { ...actual, ChartHeader: vi.fn(actual.ChartHeader) }
})

vi.mock('../../modules/chart/engine/chart-legend/legend-switch', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-legend/legend-switch')>()

	return { ...actual, LegendSwitch: vi.fn(actual.LegendSwitch) }
})

vi.mock('../../modules/chart/engine/chart-geometry/scatter', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-geometry/scatter')>()

	return {
		...actual,
		scatterDiscLayers: vi.fn(actual.scatterDiscLayers),
		scatterMarks: vi.fn(actual.scatterMarks),
	}
})

vi.mock('../../components/swatch', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../components/swatch')>()

	return { ...actual, Swatch: vi.fn(actual.Swatch) }
})

/** The table renders since the last clear: the `rangeKeys` calls for the `category` prefix. */
const tableRenders = () =>
	vi.mocked(rangeKeys).mock.calls.filter(([, prefix]) => prefix === 'category').length

/** The frame renders since the last clear. */
const headerRenders = () => vi.mocked(ChartHeader).mock.calls.length

/** The legend entry and swatch renders since the last clear. */
const legendRenders = () =>
	vi.mocked(LegendSwitch).mock.calls.length + vi.mocked(Swatch).mock.calls.length

/** The scatter layout calls since the last clear. */
const scatterLayouts = () =>
	vi.mocked(scatterMarks).mock.calls.length + vi.mocked(scatterDiscLayers).mock.calls.length

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

const REFERENCE = [{ value: 25, label: 'Goal' }]

const PIE_SERIES: [{ xKey: 'week'; yKey: 'a' }] = [{ xKey: 'week', yKey: 'a' }]

const charts = {
	line: () => <LineChart aria-label="L" title="T" data={DATA} series={SERIES} width={400} />,
	bar: () => <BarChart aria-label="B" title="T" data={DATA} series={SERIES} width={400} />,
	scatter: () => (
		<ScatterChart aria-label="S" title="T" data={DATA} series={SCATTER_SERIES} width={400} />
	),
}

/**
 * Mounts a chart, runs `atMount`, then gives it five parent renders with equal
 * props. The counts start again after `atMount`.
 */
async function renderFiveTimes(make: () => ReactElement, atMount?: () => void) {
	const { rerender } = renderUI(make())

	await act(async () => {})

	atMount?.()

	vi.mocked(rangeKeys).mockClear()

	vi.mocked(ChartHeader).mockClear()

	vi.mocked(LegendSwitch).mockClear()

	vi.mocked(Swatch).mockClear()

	vi.mocked(scatterMarks).mockClear()

	vi.mocked(scatterDiscLayers).mockClear()

	for (let pass = 0; pass < 5; pass++) {
		rerender(make())

		await act(async () => {})
	}
}

describe('chart parent render', () => {
	for (const [name, make] of Object.entries(charts)) {
		it(`${name}: holds the hidden data table through a parent render with equal props`, async () => {
			await renderFiveTimes(make, () => {
				// The table rendered on mount, so the later `toBe(0)` can fail.
				expect(tableRenders()).toBeGreaterThan(0)
			})

			expect(tableRenders()).toBe(0)
		})
	}

	it('renders the frame once for each parent render of an empty chart', async () => {
		await renderFiveTimes(() => (
			<LineChart aria-label="L" title="T" data={[] as Row[]} series={SERIES} width={400} />
		))

		expect(headerRenders()).toBe(5)
	})

	it('renders the frame once for each parent render, with no deferred table pass', async () => {
		await renderFiveTimes(charts.line)

		expect(headerRenders()).toBe(5)
	})

	const legends = {
		'line with a rule': () => (
			<LineChart
				aria-label="L"
				title="T"
				data={DATA}
				series={SERIES}
				reference={REFERENCE}
				width={400}
			/>
		),
		pie: () => <PieChart aria-label="P" title="T" data={DATA.slice(0, 6)} series={PIE_SERIES} />,
	}

	for (const [name, make] of Object.entries(legends)) {
		it(`${name}: renders no legend entry or chip for a parent render with equal props`, async () => {
			await renderFiveTimes(make, () => {
				// The legend rendered on mount, so the later `toBe(0)` can fail.
				expect(legendRenders()).toBeGreaterThan(0)
			})

			expect(legendRenders()).toBe(0)
		})
	}

	const scatters = {
		'stable series': charts.scatter,
		'a new series literal': () => (
			<ScatterChart
				aria-label="S"
				title="T"
				data={DATA}
				series={[{ xKey: 'a', yKey: 'b', yName: 'AB' }]}
				width={400}
			/>
		),
	}

	for (const [name, make] of Object.entries(scatters)) {
		it(`scatter with ${name}: lays out no disc for a parent render with equal props`, async () => {
			await renderFiveTimes(make, () => {
				// The discs laid out on mount, so the later `toBe(0)` can fail.
				expect(scatterLayouts()).toBeGreaterThan(0)
			})

			expect(scatterLayouts()).toBe(0)
		})
	}
})
