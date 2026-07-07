import { RefreshCw } from 'lucide-react'
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'
import statesUrl from 'us-atlas/states-10m.json?url'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Listbox, ListboxOption } from '../../../../components/listbox'
import { Stack } from '../../../../components/stack'
import { Stat, StatLabel, StatValue } from '../../../../components/stat'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import {
	AreaChart,
	BarChart,
	BubbleChart,
	ChoroplethChart,
	ComboChart,
	DonutChart,
	HeatmapChart,
	LineChart,
	PieChart,
	ScatterChart,
} from '../../../../modules/chart'
import type { MapGeography } from '../../../../modules/map'
import { code, Example as ExampleFrame } from '../../../engine'
import { activity, dailyVisits, greens, heat, statePopulation } from './data'

// Every chart demo renders in the same fixed-width, resizable frame so its
// responsive behaviour is visible at a glance. Wrapping the engine Example once
// here injects those defaults into all the `<Example>` call sites below —
// including AnimatedExample's — without repeating the props on each. A call site
// can still override either default by passing its own `width`/`resize`.
function Example(props: ComponentProps<typeof ExampleFrame>) {
	return <ExampleFrame width={720} minWidth={160} resize {...props} />
}

type Month = { month: string; revenue: number; costs: number; margin: number }

const months: Month[] = [
	{ month: 'Jan', revenue: 42, costs: 28, margin: 14 },
	{ month: 'Feb', revenue: 51, costs: 30, margin: 21 },
	{ month: 'Mar', revenue: 47, costs: 33, margin: 14 },
	{ month: 'Apr', revenue: 63, costs: 35, margin: 28 },
	{ month: 'May', revenue: 58, costs: 34, margin: 24 },
	{ month: 'Jun', revenue: 71, costs: 38, margin: 33 },
]

// One measure each for the spark-tile grid, drawn small enough to drop their
// chrome to pure marks with the title revealed on hover.
const sparkTiles: { title: string; yKey: 'revenue' | 'costs' | 'margin' }[] = [
	{ title: 'Revenue', yKey: 'revenue' },
	{ title: 'Costs', yKey: 'costs' },
	{ title: 'Margin', yKey: 'margin' },
]

const swings: { month: string; delta: number }[] = [
	{ month: 'Jan', delta: 12 },
	{ month: 'Feb', delta: -6 },
	{ month: 'Mar', delta: 9 },
	{ month: 'Apr', delta: -14 },
	{ month: 'May', delta: 18 },
	{ month: 'Jun', delta: 7 },
]

const sources = [
	{ source: 'Search', visits: 4820 },
	{ source: 'Direct', visits: 2210 },
	{ source: 'Referral', visits: 1370 },
	{ source: 'Social', visits: 940 },
]

type OperationsWeek = { week: string; shipments: number; exceptions: number }

// Two measures of different scale — volumes in the thousands, exceptions in the
// tens — the dual-axis case.
const operations: OperationsWeek[] = [
	{ week: 'W1', shipments: 1240, exceptions: 18 },
	{ week: 'W2', shipments: 1385, exceptions: 9 },
	{ week: 'W3', shipments: 1512, exceptions: 24 },
	{ week: 'W4', shipments: 1467, exceptions: 12 },
	{ week: 'W5', shipments: 1690, exceptions: 31 },
	{ week: 'W6', shipments: 1755, exceptions: 15 },
	{ week: 'W7', shipments: 1621, exceptions: 11 },
	{ week: 'W8', shipments: 1834, exceptions: 22 },
]

type StopRecord = { distance: number; dwell: number; handling: number; weight: number }

// One row per delivery stop — a deterministic spread with a loose upward trend,
// dwell and handling as two measures over the same distances.
const stops: StopRecord[] = Array.from({ length: 16 }, (_, index) => {
	const distance = 8 + index * 6 + Math.round(10 * Math.sin(index * 2.1))

	return {
		distance,
		dwell: 14 + Math.round(distance / 4 + 9 * Math.sin(index * 1.3)),
		handling: 8 + Math.round(distance / 6 + 7 * Math.cos(index * 1.7)),
		weight: 2 + ((index * 5) % 17),
	}
})

type FreightMonth = { month: string; rate: number; weight: number }

// Rate per pound against shipped weight — a currency beside a quantity.
const freight: FreightMonth[] = [
	{ month: 'Jan', rate: 1.42, weight: 380 },
	{ month: 'Feb', rate: 1.51, weight: 415 },
	{ month: 'Mar', rate: 1.38, weight: 462 },
	{ month: 'Apr', rate: 1.66, weight: 448 },
	{ month: 'May', rate: 1.72, weight: 530 },
	{ month: 'Jun', rate: 1.58, weight: 585 },
]

// Atlas data stays out of the package: fetch the us-atlas TopoJSON as a static
// asset on first render, the same shape a consumer's lazily-loaded geography
// takes. `null` until it lands — the choropleth reserves its frame meanwhile.
function useGeography(url: string): MapGeography | null {
	const [geography, setGeography] = useState<MapGeography | null>(null)

	useEffect(() => {
		let cancelled = false

		fetch(url)
			.then((response) => response.json())
			.then((json: MapGeography) => {
				if (!cancelled) setGeography(json)
			})
			.catch(() => {})

		return () => {
			cancelled = true
		}
	}, [url])

	return geography
}

type LegendPlacement = 'right' | 'left' | 'top' | 'bottom'

const LegendPlacementExample = ({
	children,
}: {
	children: (placement: LegendPlacement) => ReactNode
}) => {
	const [placement, setPlacement] = useState<LegendPlacement>('right')

	return (
		<Example
			title="Legend placement"
			code={code`<BarChart aspectRatio={16 / 9} legend={placement} … /> // plot stays 16:9`}
			actions={
				<Listbox
					placement="bottom-end"
					aria-label="Legend placement"
					value={placement}
					displayValue={(value) => value.at(0)?.toUpperCase() + value.slice(1)}
					onValueChange={(value) => setPlacement(value as LegendPlacement)}
				>
					{(['right', 'left', 'top', 'bottom'] as LegendPlacement[]).map((option) => (
						<ListboxOption key={option} value={option}>
							{option.charAt(0).toUpperCase() + option.slice(1)}
						</ListboxOption>
					))}
				</Listbox>
			}
		>
			{children(placement)}
		</Example>
	)
}

// The mount animation plays once; a refresh button remounts the chart
// (bumping its `key`) so the reveal replays on demand.
function AnimatedExample({
	title,
	source,
	children,
}: {
	title: string
	source: ReturnType<typeof code>
	children: ReactNode
}) {
	const [runKey, setRunKey] = useState(0)

	return (
		<Example
			title={title}
			code={source}
			actions={
				<Button
					variant="bare"
					aria-label="Replay animation"
					onClick={() => setRunKey((n) => n + 1)}
				>
					<Icon icon={<RefreshCw />} />
				</Button>
			}
		>
			<div key={runKey}>{children}</div>
		</Example>
	)
}

export function Demo() {
	const states = useGeography(statesUrl)

	return (
		<Tabs defaultValue="bar">
			<Stack gap="lg">
				<TabList aria-label="Chart kind">
					<Tab value="bar">Bar</Tab>
					<Tab value="line">Line</Tab>
					<Tab value="area">Area</Tab>
					<Tab value="pie">Pie</Tab>
					<Tab value="donut">Donut</Tab>
					<Tab value="combo">Combo</Tab>
					<Tab value="scatter">Scatter</Tab>
					<Tab value="bubble">Bubble</Tab>
					<Tab value="heatmap">Heatmap</Tab>
					<Tab value="choropleth">Choropleth</Tab>
					<Tab value="tiers">Tiers</Tab>
				</TabList>
				<TabContents>
					<TabContent value="bar">
						<Stack gap="xl">
							<Example title="Grouped" code={code`<BarChart … />`}>
								<BarChart
									aria-label="Revenue and costs by month"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
									]}
								/>
							</Example>

							<Example title="Stacked" code={code`<BarChart stacked … />`}>
								<BarChart
									aria-label="Revenue and costs by month, stacked"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
									]}
									stacked
								/>
							</Example>

							<Example title="Texture" code={code`<BarChart texture … />`}>
								<BarChart
									aria-label="Revenue and costs by month, textured"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
									]}
									texture
								/>
							</Example>

							<Example title="Horizontal" code={code`<BarChart orientation="horizontal" … />`}>
								<BarChart
									aria-label="Traffic by source"
									data={sources}
									series={[{ xKey: 'source', yKey: 'visits', yName: 'Visits' }]}
									orientation="horizontal"
								/>
							</Example>

							<Example title="Negative values" code={code`<BarChart crosshair … />`}>
								<BarChart
									aria-label="Month-over-month swing"
									data={swings}
									series={[{ xKey: 'month', yKey: 'delta', yName: 'Swing' }]}
									crosshair
								/>
							</Example>

							<Example
								title="Click to pin the tooltip"
								code={code`<BarChart tooltip={{ trigger: 'click' }} … />`}
							>
								<BarChart
									aria-label="Revenue and costs by month"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
									]}
									tooltip={{ trigger: 'click' }}
								/>
							</Example>

							<Example
								title="Reference lines"
								code={code`<BarChart legend reference={[{ value: 55, label: 'Target', color: 'green' }, { value: 80, label: 'Ceiling', color: '#e11d48' }]} … />`}
							>
								<BarChart
									aria-label="Revenue by month against a target and ceiling"
									data={months}
									series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
									legend
									reference={[
										{ value: 55, label: 'Target', color: 'green' },
										{ value: 80, label: 'Ceiling', color: '#e11d48' },
									]}
								/>
							</Example>

							<LegendPlacementExample>
								{(placement) => (
									<BarChart
										aria-label={`Revenue and costs by month, legend ${placement}`}
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
										aspectRatio={16 / 9}
										legend={placement}
									/>
								)}
							</LegendPlacementExample>

							<AnimatedExample title="Animated" source={code`<BarChart animate … />`}>
								<BarChart
									aria-label="Revenue and costs by month, animated"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs', color: 'rose' },
									]}
									reference={[{ value: 55, label: 'Margin', color: 'amber' }]}
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="line">
						<Stack gap="xl">
							<Example title="Single-series" code={code`<LineChart … />`}>
								<LineChart
									aria-label="Revenue by month"
									data={months}
									series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
								/>
							</Example>

							<Example title="Multi-series" code={code`<LineChart crosshair={{ snap: true }} … />`}>
								<LineChart
									aria-label="Revenue and margin by month"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
									]}
									crosshair={{ snap: true }}
								/>
							</Example>

							<Example
								title="Custom colours"
								code={code`<LineChart series={[{ …, color: '#e11d48' }, { …, color: 'oklch(0.68 0.17 250)' }]} … />`}
							>
								<LineChart
									aria-label="Revenue and margin by month, in custom colours"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: '#e11d48' },
										{
											xKey: 'month',
											yKey: 'margin',
											yName: 'Margin',
											color: 'oklch(0.68 0.17 250)',
										},
									]}
								/>
							</Example>

							<Example
								title="Dual axis"
								code={code`<LineChart leftAxis={{ format: … }} rightAxis={{ format: … }} series={[…, { …, axis: 'right' }]} … />`}
							>
								<LineChart
									aria-label="Rate per pound against shipped weight by month"
									data={freight}
									series={[
										{ xKey: 'month', yKey: 'rate', yName: 'Rate' },
										{ xKey: 'month', yKey: 'weight', yName: 'Weight', axis: 'right' },
									]}
									leftAxis={{ title: '$ / lb', format: (value) => `$${value.toFixed(2)}` }}
									rightAxis={{ title: 'Weight', format: (value) => `${value}k lb` }}
									crosshair={{ snap: true }}
								/>
							</Example>

							<Example
								title="Dashed line"
								code={code`<LineChart series={[{ … }, { …, axis: 'right', dashed: true }]} … />`}
							>
								<LineChart
									aria-label="Rate per pound against shipped weight by month, the weight line dashed"
									data={freight}
									series={[
										{ xKey: 'month', yKey: 'rate', yName: 'Rate' },
										{
											xKey: 'month',
											yKey: 'weight',
											yName: 'Weight',
											axis: 'right',
											dashed: true,
										},
									]}
									leftAxis={{ title: '$ / lb', format: (value) => `$${value.toFixed(2)}` }}
									rightAxis={{ title: 'Weight', format: (value) => `${value}k lb` }}
									points
									crosshair={{ snap: true }}
								/>
							</Example>

							<Example title="Time axis" code={code`<LineChart xAxis="time" … />`}>
								<LineChart
									aria-label="Visits by day"
									data={dailyVisits}
									series={[{ xKey: 'date', yKey: 'visits', yName: 'Visits' }]}
									xAxis="time"
								/>
							</Example>

							<Example title="Points" code={code`<LineChart points … />`}>
								<LineChart
									aria-label="Revenue by month"
									data={months}
									series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
									points
								/>
							</Example>

							<Example
								title="Value labels"
								code={code`<LineChart labels={{ endpoints: true, extremes: true }} … />`}
							>
								<LineChart
									aria-label="Revenue and margin by month, with value labels"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
									]}
									points
									labels={{ endpoints: true, extremes: true }}
								/>
							</Example>

							<Example
								title="Reference labels"
								code={code`<LineChart reference={[{ value: 60, label: 'Target', color: 'green' }]} labels={{ references: true }} … />`}
							>
								<LineChart
									aria-label="Revenue by month against a target, with reference labels"
									data={months}
									series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
									reference={[{ value: 60, label: 'Target', color: 'green' }]}
									labels={{ references: true }}
								/>
							</Example>

							<Example
								title="Smooth interpolation"
								code={code`<LineChart interpolation="smooth" … />`}
							>
								<LineChart
									aria-label="Revenue and margin by month, smoothed"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
									]}
									interpolation="smooth"
								/>
							</Example>

							<Example title="Fill" code={code`<LineChart fill … />`}>
								<LineChart
									aria-label="Revenue by month"
									data={months}
									series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
									fill
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<LineChart animate … />`}>
								<LineChart
									aria-label="Revenue and margin by month, animated"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
									]}
									fill
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="area">
						<Stack gap="xl">
							<Example title="Single-series" code={code`<AreaChart … />`}>
								<AreaChart
									aria-label="Revenue by month"
									data={months}
									series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: 'orange' }]}
								/>
							</Example>

							<Example title="Stacked" code={code`<AreaChart stacked … />`}>
								<AreaChart
									aria-label="Revenue and costs by month, stacked"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
									]}
									stacked
								/>
							</Example>

							<Example
								title="Smooth interpolation"
								code={code`<AreaChart interpolation="smooth" crosshair={{ x: false, y: true }} … />`}
							>
								<AreaChart
									aria-label="Revenue and margin by month"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
									]}
									interpolation="smooth"
									crosshair={{ x: false, y: true }}
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<AreaChart stacked animate … />`}>
								<AreaChart
									aria-label="Revenue and costs by month, stacked and animated"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
									]}
									stacked
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="pie">
						<Stack gap="xl">
							<Example title="No labels" code={code`<PieChart … />`}>
								<PieChart
									aria-label="Traffic by source"
									data={sources}
									series={[{ xKey: 'source', yKey: 'visits' }]}
								/>
							</Example>

							<Example
								title="Segment labels"
								code={code`<PieChart labels={{ segment: true }} … />`}
							>
								<PieChart
									aria-label="Traffic by source"
									data={sources}
									series={[{ xKey: 'source', yKey: 'visits' }]}
									labels={{ segment: true }}
								/>
							</Example>

							<Example
								title="Callout labels"
								code={code`<PieChart labels={{ callouts: true }} … />`}
							>
								<PieChart
									aria-label="Traffic by source"
									data={sources}
									series={[{ xKey: 'source', yKey: 'visits' }]}
									labels={{ callouts: true }}
								/>
							</Example>

							<LegendPlacementExample>
								{(placement) => (
									<PieChart
										aria-label={`Traffic by source, legend ${placement}`}
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										legend={placement}
									/>
								)}
							</LegendPlacementExample>

							<AnimatedExample title="Animated" source={code`<PieChart animate … />`}>
								<PieChart
									aria-label="Traffic by source, animated"
									data={sources}
									series={[{ xKey: 'source', yKey: 'visits' }]}
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="donut">
						<Stack gap="xl">
							<Example title="Basic" code={code`<DonutChart>`}>
								<DonutChart
									aria-label="Traffic by source"
									data={sources}
									series={[{ xKey: 'source', yKey: 'visits' }]}
								/>
							</Example>

							<Example title="Center content" code={code`<DonutChart>…</DonutChart>`}>
								<DonutChart
									aria-label="Traffic by source"
									data={sources}
									series={[{ xKey: 'source', yKey: 'visits' }]}
								>
									<Stat>
										<StatLabel>Total visits</StatLabel>
										<StatValue>9,340</StatValue>
									</Stat>
								</DonutChart>
							</Example>

							<AnimatedExample title="Animated" source={code`<DonutChart animate … />`}>
								<DonutChart
									aria-label="Traffic by source, animated"
									data={sources}
									series={[{ xKey: 'source', yKey: 'visits' }]}
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="combo">
						<Stack gap="xl">
							<Example
								title="Bar and line"
								code={code`<ComboChart crosshair={{ snap: true }} … />`}
							>
								<ComboChart
									aria-label="Revenue bars with margin line by month"
									data={months}
									series={[
										{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
									]}
									crosshair={{ snap: true }}
								/>
							</Example>

							<Example
								title="Bar, area, and line"
								code={code`<ComboChart series={[{ type: 'bar' … }, { type: 'area' … }, { type: 'line' … }]} … />`}
							>
								<ComboChart
									aria-label="Revenue bars over a cost area with a margin line by month"
									data={months}
									series={[
										{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ type: 'area', xKey: 'month', yKey: 'costs', yName: 'Costs' },
										{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
									]}
									crosshair={{ snap: true }}
								/>
							</Example>

							<Example
								title="Dual axis"
								code={code`<ComboChart rightAxis={{ title: 'Exceptions' }} series={[…, { …, axis: 'right' }]} … />`}
							>
								<ComboChart
									aria-label="Weekly shipments with exception counts"
									data={operations}
									series={[
										{ type: 'area', xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
										{
											type: 'line',
											xKey: 'week',
											yKey: 'exceptions',
											yName: 'Exceptions',
											axis: 'right',
										},
									]}
									leftAxis={{ title: 'Shipments' }}
									rightAxis={{ title: 'Exceptions' }}
									crosshair={{ snap: true }}
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<ComboChart animate … />`}>
								<ComboChart
									aria-label="Revenue bars over a cost area with a margin line by month, animated"
									data={months}
									series={[
										{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ type: 'area', xKey: 'month', yKey: 'costs', yName: 'Costs' },
										{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
									]}
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="scatter">
						<Stack gap="xl">
							<Example
								title="Multi-series"
								code={code`<ScatterChart crosshair={{ snap: true }} … />`}
							>
								<ScatterChart
									aria-label="Dwell and handling time against stop distance"
									data={stops}
									series={[
										{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
										{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
									]}
									formatXValue={(value) => `${value} mi`}
									crosshair={{ snap: true }}
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<ScatterChart animate … />`}>
								<ScatterChart
									aria-label="Dwell and handling time against stop distance, animated"
									data={stops}
									series={[
										{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
										{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
									]}
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="bubble">
						<Stack gap="xl">
							<Example
								title="Size encoding"
								code={code`<BubbleChart series={[{ …, sizeKey: 'weight' }]} … />`}
							>
								<BubbleChart
									aria-label="Dwell against distance, sized by weight"
									data={stops}
									series={[
										{
											xKey: 'distance',
											yKey: 'dwell',
											sizeKey: 'weight',
											sizeName: 'Weight',
											yName: 'Stops',
										},
									]}
									formatXValue={(value) => `${value} mi`}
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<BubbleChart animate … />`}>
								<BubbleChart
									aria-label="Dwell against distance, sized by weight, animated"
									data={stops}
									series={[
										{
											xKey: 'distance',
											yKey: 'dwell',
											sizeKey: 'weight',
											sizeName: 'Weight',
											yName: 'Stops',
										},
									]}
									formatXValue={(value) => `${value} mi`}
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="heatmap">
						<Stack gap="xl">
							<Example
								title="Activity"
								code={code`<HeatmapChart series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: greens }]} … />`}
							>
								<HeatmapChart
									className="max-w-md"
									aria-label="Commits by weekday and hour"
									data={activity}
									series={[
										{
											xKey: 'hour',
											yKey: 'day',
											colorKey: 'commits',
											colorRange: greens,
											colorName: 'Commits',
										},
									]}
									formatValue={(value) => value.toFixed(0)}
								/>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="choropleth">
						<Stack gap="xl">
							<Example
								title="Heatmap"
								code={code`<ChoroplethChart legend="range" series={[{ …, colorRange: heat }]} … />`}
							>
								<ChoroplethChart
									aria-label="Resident population by state, heatmap"
									geography={states}
									projection="albers-usa"
									legend="range"
									data={statePopulation}
									series={[
										{
											idKey: 'state',
											colorKey: 'people',
											colorRange: heat,
											colorName: 'Population',
										},
									]}
									regionId={(feature) => String(feature.properties?.name)}
									formatValue={(value) => `${value.toFixed(1)}M`}
								/>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="tiers">
						<Stack gap="xl">
							<Example
								title="Title and subtitle"
								code={code`<BarChart title="Revenue & costs" subtitle="Last six months, in thousands" … />`}
							>
								<BarChart
									aria-label="Revenue and costs by month"
									title="Revenue & costs"
									subtitle="Last six months, in thousands"
									data={months}
									series={[
										{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
										{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
									]}
								/>
							</Example>

							<Example
								title="Spark tiles — hover a tile for its title"
								code={code`<LineChart title="Revenue" width={150} … />`}
							>
								<div className="flex flex-wrap gap-3">
									{sparkTiles.map(({ title, yKey }) => (
										<LineChart
											key={yKey}
											aria-label={`${title} by month`}
											title={title}
											width={150}
											data={months}
											series={[{ xKey: 'month', yKey }]}
										/>
									))}
								</div>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
