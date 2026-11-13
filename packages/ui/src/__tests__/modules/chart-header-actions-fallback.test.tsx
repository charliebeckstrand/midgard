import { describe, expect, it, vi } from 'vitest'
import {
	AreaChart,
	BarChart,
	BubbleChart,
	type ChartContextMenuConfig,
	ChartHeaderActionsFallback,
	type ChartHeaderActionsFallbackProps,
	ChoroplethChart,
	ComboChart,
	DonutChart,
	HeatmapChart,
	LineChart,
	PieChart,
	ScatterChart,
	SeatChart,
} from '../../modules/chart'
import { HeaderActions, HeaderActionsSlot } from '../../primitives/header-actions'
import { getSlot, noop, renderUI } from '../helpers'
import { serverMarkup } from '../helpers/hydrate'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** A chart element, as the fallback takes it. */
type ChartElement = ChartHeaderActionsFallbackProps['chart']

type Row = { quarter: string; revenue: number; x: number; size: number }

const ROWS: Row[] = [
	{ quarter: 'Q1', revenue: 10, x: 1, size: 3 },
	{ quarter: 'Q2', revenue: 20, x: 2, size: 5 },
]

type Cell = { day: string; hour: string; commits: number }

const CELLS: Cell[] = [
	{ day: 'Mon', hour: '9', commits: 1 },
	{ day: 'Tue', hour: '9', commits: 5 },
]

type Region = { region: string; pop: number }

const REGIONS: Region[] = [
	{ region: 'A', pop: 10 },
	{ region: 'B', pop: 50 },
]

/** Each kind of chart, with its data or with none. */
function charts(full: boolean, contextMenu?: ChartContextMenuConfig): [string, ChartElement][] {
	const rows = full ? ROWS : []

	const props = { title: 'Revenue', 'aria-label': 'Revenue', contextMenu }

	const cartesian = [{ xKey: 'quarter', yKey: 'revenue' }] as const

	return Object.entries({
		AreaChart: <AreaChart {...props} data={rows} series={[...cartesian]} />,
		BarChart: <BarChart {...props} data={rows} series={[...cartesian]} />,
		LineChart: <LineChart {...props} data={rows} series={[...cartesian]} />,
		ComboChart: <ComboChart {...props} data={rows} series={[{ ...cartesian[0], type: 'bar' }]} />,
		PieChart: <PieChart {...props} data={rows} series={[...cartesian]} />,
		DonutChart: <DonutChart {...props} data={rows} series={[...cartesian]} />,
		ScatterChart: <ScatterChart {...props} data={rows} series={[{ xKey: 'x', yKey: 'revenue' }]} />,
		BubbleChart: (
			<BubbleChart
				{...props}
				data={rows}
				series={[{ xKey: 'x', yKey: 'revenue', sizeKey: 'size' }]}
			/>
		),
		HeatmapChart: (
			<HeatmapChart
				{...props}
				data={full ? CELLS : []}
				series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: ['#fff', '#000'] }]}
			/>
		),
		ChoroplethChart: (
			<ChoroplethChart
				{...props}
				geography={FIXTURE_GEOJSON}
				data={full ? REGIONS : []}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: ['#fff', '#000'] }]}
			/>
		),
		SeatChart: (
			<SeatChart
				{...props}
				groups={full ? [{ seats: 3, color: 'blue', label: 'Blue' }] : []}
				height={200}
			/>
		),
	})
}

/** The buttons in a header row, in order: the slot of each, and whether it is disabled. */
function buttons(root: ParentNode): string[] {
	return [
		...root.querySelectorAll('[data-slot="chart-view-data"], [data-slot="chart-menu-button"]'),
	].map((node) => {
		const button = node instanceof HTMLButtonElement ? node : node.querySelector('button')

		return `${node.getAttribute('data-slot')}${button?.disabled ? ' (disabled)' : ''}`
	})
}

/** The buttons that the chart puts in the header row of a box after the mount. */
function chartButtons(chart: ChartElement): string[] {
	const { container, unmount } = renderUI(
		<HeaderActions>
			<HeaderActionsSlot />

			<div>{chart}</div>
		</HeaderActions>,
	)

	const row = buttons(getSlot(container, 'header-actions'))

	unmount()

	return row
}

/** The buttons that the fallback draws in the server render. */
function fallbackButtons(chart: ChartElement): string[] {
	return buttons(serverMarkup(<ChartHeaderActionsFallback chart={chart} />))
}

// The fallback reads the props of the chart element with the rules of the
// chart menu and of the readout of the chart. Each test compares the server
// render of the fallback with the row that the mounted chart puts in the box.
describe('ChartHeaderActionsFallback', () => {
	it.each(charts(true, { button: true }))('draws the buttons of a %s with data', (_, chart) => {
		const fallback = fallbackButtons(chart)

		expect(fallback).toEqual(['chart-view-data', 'chart-menu-button'])

		expect(fallback).toEqual(chartButtons(chart))
	})

	it.each(charts(false, { button: true }))(
		'draws no View data for a %s with no data',
		(_, chart) => {
			const fallback = fallbackButtons(chart)

			expect(fallback).toEqual(['chart-menu-button'])

			expect(fallback).toEqual(chartButtons(chart))
		},
	)

	const drillItems = vi.fn(({ index }: { index: number | null }) =>
		index === null ? [] : [{ key: 'drill', label: `Drill ${index}`, onAction: noop }],
	)

	it.each<[string, ChartContextMenuConfig | false | undefined, string[]]>([
		['the default menu', undefined, ['chart-view-data']],
		['a menu button', { button: true }, ['chart-view-data', 'chart-menu-button']],
		['the menu off', false, []],
		// No entries, so the chart shows no menu button.
		['no default items and no items', { button: true, defaultItems: false }, []],
		[
			'function items that give nothing for no mark',
			{ button: true, defaultItems: false, items: drillItems },
			[],
		],
		[
			'a custom View data item',
			{ defaultItems: false, items: [{ key: 'view-data', label: 'Table', onAction: noop }] },
			['chart-view-data'],
		],
		[
			'a disabled custom View data item',
			{
				defaultItems: false,
				items: [{ key: 'view-data', label: 'Table', onAction: noop, disabled: true }],
			},
			['chart-view-data (disabled)'],
		],
		[
			'a View data item with no action',
			{ button: true, defaultItems: false, items: [{ key: 'view-data', label: 'Table' }] },
			['chart-menu-button'],
		],
	])('draws the buttons of the chart for %s', (_, contextMenu, expected) => {
		const chart = (
			<BarChart
				title="Revenue"
				aria-label="Revenue"
				data={ROWS}
				contextMenu={contextMenu}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
			/>
		)

		const fallback = fallbackButtons(chart)

		expect(fallback).toEqual(expected)

		expect(fallback).toEqual(chartButtons(chart))
	})

	it('names View data after the chart title', () => {
		const markup = serverMarkup(
			<ChartHeaderActionsFallback
				chart={
					<BarChart
						title="Revenue"
						aria-label="Revenue"
						data={ROWS}
						series={[{ xKey: 'quarter', yKey: 'revenue' }]}
					/>
				}
			/>,
		)

		expect(getSlot(markup, 'chart-view-data')).toHaveAttribute(
			'aria-label',
			'View data for Revenue',
		)
	})

	it('marks its own fullscreen as the chart does', () => {
		const markup = serverMarkup(
			<ChartHeaderActionsFallback
				chart={
					<BarChart
						aria-label="Revenue"
						data={ROWS}
						contextMenu={{ button: true }}
						series={[{ xKey: 'quarter', yKey: 'revenue' }]}
					/>
				}
			/>,
		)

		expect(markup.querySelector('[data-own-fullscreen]')).not.toBeNull()
	})
})
