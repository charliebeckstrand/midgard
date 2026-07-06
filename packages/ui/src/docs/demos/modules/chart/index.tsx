import { RefreshCw } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import statesUrl from 'us-atlas/states-10m.json?url'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Stack } from '../../../../components/stack'
import { Stat, StatLabel, StatValue } from '../../../../components/stat'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import { cn } from '../../../../core'
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
import { code, Example } from '../../../engine'
import { activity, dailyVisits, greens, heat, statePopulation } from './data'

type Month = { month: string; revenue: number; costs: number; margin: number }

const months: Month[] = [
	{ month: 'Jan', revenue: 42, costs: 28, margin: 14 },
	{ month: 'Feb', revenue: 51, costs: 30, margin: 21 },
	{ month: 'Mar', revenue: 47, costs: 33, margin: 14 },
	{ month: 'Apr', revenue: 63, costs: 35, margin: 28 },
	{ month: 'May', revenue: 58, costs: 34, margin: 24 },
	{ month: 'Jun', revenue: 71, costs: 38, margin: 33 },
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

const ChartContainer = ({ children, size = 'lg' }: { children: ReactNode; size?: string }) => {
	const sizeMap: Record<string, string> = {
		sm: 'sm:max-w-sm',
		md: 'sm:max-w-md',
		lg: 'sm:max-w-lg',
	}

	return <div className={cn('w-full', size ? sizeMap[size] : sizeMap.lg)}>{children}</div>
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
				</TabList>
				<TabContents>
					<TabContent value="bar">
						<Stack gap="xl">
							<Example title="Grouped" code={code`<BarChart … />`}>
								<ChartContainer>
									<BarChart
										aria-label="Revenue and costs by month"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
									/>
								</ChartContainer>
							</Example>

							<Example title="Stacked" code={code`<BarChart stacked … />`}>
								<ChartContainer>
									<BarChart
										aria-label="Revenue and costs by month, stacked"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
										stacked
									/>
								</ChartContainer>
							</Example>

							<Example title="Texture" code={code`<BarChart texture … />`}>
								<ChartContainer>
									<BarChart
										aria-label="Revenue, costs, and margin by month, textured"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
											{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
										]}
										texture
									/>
								</ChartContainer>
							</Example>

							<Example title="Horizontal" code={code`<BarChart orientation="horizontal" … />`}>
								<ChartContainer>
									<BarChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits', yName: 'Visits' }]}
										orientation="horizontal"
									/>
								</ChartContainer>
							</Example>

							<Example title="Negative values" code={code`<BarChart crosshair … />`}>
								<ChartContainer>
									<BarChart
										aria-label="Month-over-month swing"
										data={swings}
										series={[{ xKey: 'month', yKey: 'delta', yName: 'Swing' }]}
										crosshair
									/>
								</ChartContainer>
							</Example>

							<Example
								title="Reference lines"
								code={code`<BarChart legend reference={[{ value: 55, label: 'Target', color: 'green' }, { value: 68, label: 'Ceiling', color: '#e11d48' }]} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<BarChart animate … />`}>
								<ChartContainer>
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
								</ChartContainer>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="line">
						<Stack gap="xl">
							<Example title="Single-series" code={code`<LineChart … />`}>
								<ChartContainer>
									<LineChart
										aria-label="Revenue by month"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
									/>
								</ChartContainer>
							</Example>

							<Example title="Multi-series" code={code`<LineChart crosshair={{ snap: true }} … />`}>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<Example
								title="Dual axis"
								code={code`<LineChart leftAxis={{ format: … }} rightAxis={{ format: … }} series={[…, { …, axis: 'right' }]} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<Example title="Time axis" code={code`<LineChart xAxis="time" … />`}>
								<ChartContainer>
									<LineChart
										aria-label="Visits by day"
										data={dailyVisits}
										series={[{ xKey: 'date', yKey: 'visits', yName: 'Visits' }]}
										xAxis="time"
									/>
								</ChartContainer>
							</Example>

							<Example title="Points" code={code`<LineChart fill points … />`}>
								<ChartContainer>
									<LineChart
										aria-label="Revenue by month"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
										points
									/>
								</ChartContainer>
							</Example>

							<Example
								title="Value labels"
								code={code`<LineChart labels={{ endpoints: true, extremes: true }} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<Example
								title="Smooth interpolation"
								code={code`<LineChart interpolation="smooth" … />`}
							>
								<ChartContainer>
									<LineChart
										aria-label="Revenue and margin by month, smoothed"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
										]}
										interpolation="smooth"
									/>
								</ChartContainer>
							</Example>

							<Example title="Fill" code={code`<LineChart fill … />`}>
								<ChartContainer>
									<LineChart
										aria-label="Revenue by month"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
										fill
									/>
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<LineChart animate … />`}>
								<ChartContainer>
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
								</ChartContainer>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="area">
						<Stack gap="xl">
							<Example title="Single-series" code={code`<AreaChart … />`}>
								<ChartContainer>
									<AreaChart
										aria-label="Revenue by month"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: 'orange' }]}
									/>
								</ChartContainer>
							</Example>

							<Example title="Stacked" code={code`<AreaChart stacked … />`}>
								<ChartContainer>
									<AreaChart
										aria-label="Revenue and costs by month, stacked"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
										stacked
									/>
								</ChartContainer>
							</Example>

							<Example
								title="Smooth interpolation"
								code={code`<AreaChart interpolation="smooth" crosshair={{ x: false, y: true }} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<AreaChart stacked animate … />`}>
								<ChartContainer>
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
								</ChartContainer>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="pie">
						<Stack gap="xl">
							<Example title="No labels" code={code`<PieChart … />`}>
								<ChartContainer size="sm">
									<PieChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
									/>
								</ChartContainer>
							</Example>

							<Example
								title="Segment labels"
								code={code`<PieChart labels={{ segment: true }} legend={false} … />`}
							>
								<ChartContainer size="sm">
									<PieChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										labels={{ segment: true }}
									/>
								</ChartContainer>
							</Example>

							<Example
								title="Callout labels"
								code={code`<PieChart labels={{ callouts: true }} … />`}
							>
								<ChartContainer>
									<PieChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										labels={{ callouts: true }}
									/>
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<PieChart animate … />`}>
								<ChartContainer size="sm">
									<PieChart
										aria-label="Traffic by source, animated"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										animate
									/>
								</ChartContainer>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="donut">
						<Stack gap="xl">
							<Example title="Basic" code={code`<DonutChart>`}>
								<ChartContainer size="sm">
									<DonutChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
									/>
								</ChartContainer>
							</Example>

							<Example title="Center content" code={code`<DonutChart>…</DonutChart>`}>
								<ChartContainer size="sm">
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
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<DonutChart animate … />`}>
								<ChartContainer size="sm">
									<DonutChart
										aria-label="Traffic by source, animated"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										animate
									/>
								</ChartContainer>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="combo">
						<Stack gap="xl">
							<Example
								title="Bar and line"
								code={code`<ComboChart crosshair={{ snap: true }} … />`}
							>
								<ChartContainer>
									<ComboChart
										aria-label="Revenue bars with margin line by month"
										data={months}
										series={[
											{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
										]}
										crosshair={{ snap: true }}
									/>
								</ChartContainer>
							</Example>

							<Example
								title="Bar, area, and line"
								code={code`<ComboChart series={[{ type: 'bar' … }, { type: 'area' … }, { type: 'line' … }]} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<Example
								title="Dual axis"
								code={code`<ComboChart rightAxis={{ title: 'Exceptions' }} series={[…, { …, axis: 'right' }]} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<ComboChart animate … />`}>
								<ChartContainer>
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
								</ChartContainer>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="scatter">
						<Stack gap="xl">
							<Example
								title="Multi-series"
								code={code`<ScatterChart crosshair={{ snap: true }} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<ScatterChart animate … />`}>
								<ChartContainer>
									<ScatterChart
										aria-label="Dwell and handling time against stop distance, animated"
										data={stops}
										series={[
											{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
											{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
										]}
										animate
									/>
								</ChartContainer>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="bubble">
						<Stack gap="xl">
							<Example
								title="Size encoding"
								code={code`<BubbleChart series={[{ …, sizeKey: 'weight' }]} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<BubbleChart animate … />`}>
								<ChartContainer>
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
								</ChartContainer>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="heatmap">
						<Stack gap="xl">
							<Example
								title="Activity"
								code={code`<HeatmapChart series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: greens }]} … />`}
							>
								<ChartContainer size="md">
									<HeatmapChart
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
								</ChartContainer>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="choropleth">
						<Stack gap="xl">
							<Example
								title="Heatmap"
								code={code`<ChoroplethChart legend="range" series={[{ …, colorRange: heat }]} … />`}
							>
								<ChartContainer>
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
								</ChartContainer>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
