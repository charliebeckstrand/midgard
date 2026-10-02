import {
	AreaChart,
	BarChart,
	BubbleChart,
	ComboChart,
	DonutChart,
	HeatmapChart,
	LineChart,
	PieChart,
	ScatterChart,
} from '../../../modules/chart'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

const MONTHS = [
	{ month: 'Jan', revenue: 42, costs: 28, margin: 14 },
	{ month: 'Feb', revenue: 51, costs: 30, margin: 21 },
	{ month: 'Mar', revenue: 47, costs: 33, margin: 14 },
	{ month: 'Apr', revenue: 63, costs: 35, margin: 28 },
	{ month: 'May', revenue: 58, costs: 34, margin: 24 },
	{ month: 'Jun', revenue: 71, costs: 38, margin: 33 },
]

const SOURCES = [
	{ source: 'Search', visits: 4820 },
	{ source: 'Direct', visits: 2210 },
	{ source: 'Referral', visits: 1370 },
	{ source: 'Social', visits: 940 },
]

const STOPS = [
	{ distance: 8, dwell: 16, handling: 10, weight: 2 },
	{ distance: 17, dwell: 22, handling: 9, weight: 7 },
	{ distance: 24, dwell: 18, handling: 14, weight: 12 },
	{ distance: 31, dwell: 27, handling: 11, weight: 17 },
	{ distance: 38, dwell: 25, handling: 16, weight: 5 },
	{ distance: 46, dwell: 33, handling: 13, weight: 10 },
	{ distance: 53, dwell: 30, handling: 19, weight: 15 },
	{ distance: 61, dwell: 38, handling: 17, weight: 3 },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const HOURS = ['09', '12', '15', '18']

const COMMITS = [
	[9, 6, 8, 4],
	[7, 5, 9, 3],
	[10, 4, 7, 2],
	[6, 7, 8, 5],
	[5, 3, 4, 1],
]

const ACTIVITY = DAYS.flatMap((day, dayIndex) =>
	HOURS.map((hour, hourIndex) => ({ day, hour, commits: COMMITS[dayIndex]?.[hourIndex] ?? 0 })),
)

const GREENS = [
	'oklch(0.962 0.044 156.743)',
	'oklch(0.871 0.15 154.449)',
	'oklch(0.723 0.219 149.579)',
	'oklch(0.527 0.154 150.069)',
	'oklch(0.393 0.095 152.535)',
]

const EMPTY: { month: string; revenue: number }[] = []

export function Sheet() {
	return (
		<FixtureSheet title="Charts">
			<FixtureGroup title="Cartesian">
				<FixtureCase label="line">
					<LineChart
						aria-label="Revenue and costs by month"
						className="w-full"
						data={MONTHS}
						series={[
							{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
							{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
						]}
					/>
				</FixtureCase>
				<FixtureCase label="area">
					<AreaChart
						aria-label="Revenue and costs by month, stacked"
						className="w-full"
						data={MONTHS}
						series={[
							{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
							{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
						]}
						stacked
					/>
				</FixtureCase>
				<FixtureCase label="bar">
					<BarChart
						aria-label="Revenue and costs by month, bars"
						className="w-full"
						data={MONTHS}
						series={[
							{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
							{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
						]}
					/>
				</FixtureCase>
				<FixtureCase label="combo">
					<ComboChart
						aria-label="Revenue bars, cost area, and margin line by month"
						className="w-full"
						data={MONTHS}
						series={[
							{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
							{ type: 'area', xKey: 'month', yKey: 'costs', yName: 'Costs' },
							{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
						]}
					/>
				</FixtureCase>
				<FixtureCase label="scatter">
					<ScatterChart
						aria-label="Dwell and handling time against distance"
						className="w-full"
						data={STOPS}
						series={[
							{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
							{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
						]}
					/>
				</FixtureCase>
				<FixtureCase label="bubble">
					<BubbleChart
						aria-label="Dwell against distance, sized by weight"
						className="w-full"
						data={STOPS}
						series={[
							{
								xKey: 'distance',
								yKey: 'dwell',
								sizeKey: 'weight',
								sizeName: 'Weight',
								yName: 'Stops',
							},
						]}
						legend
					/>
				</FixtureCase>
				<FixtureCase label="empty data">
					<BarChart
						aria-label="No data"
						className="w-full"
						data={EMPTY}
						series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
						legend
					/>
				</FixtureCase>
			</FixtureGroup>
			<FixtureGroup title="Sector">
				<FixtureCase label="pie">
					<PieChart
						aria-label="Traffic by source"
						height={240}
						className="w-full"
						data={SOURCES}
						series={[{ xKey: 'source', yKey: 'visits' }]}
					/>
				</FixtureCase>
				<FixtureCase label="donut">
					<DonutChart
						aria-label="Traffic by source, donut"
						height={240}
						className="w-full"
						data={SOURCES}
						series={[{ xKey: 'source', yKey: 'visits' }]}
					/>
				</FixtureCase>
			</FixtureGroup>
			<FixtureGroup title="Heatmap">
				<FixtureCase label="heatmap">
					<HeatmapChart
						aria-label="Commits by weekday and hour"
						className="w-full"
						data={ACTIVITY}
						series={[
							{
								xKey: 'hour',
								yKey: 'day',
								colorKey: 'commits',
								colorRange: GREENS,
								colorName: 'Commits',
							},
						]}
						formatValue={(value) => value.toFixed(0)}
					/>
				</FixtureCase>
				<FixtureCase label="line, full width" wide>
					<LineChart
						aria-label="Revenue, costs, and margin by month, full width"
						className="w-full"
						data={MONTHS}
						series={[
							{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
							{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
							{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
						]}
						aspectRatio={4}
						legend="bottom"
					/>
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}
