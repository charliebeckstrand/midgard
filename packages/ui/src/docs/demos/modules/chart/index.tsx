import { RefreshCw } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import statesUrl from 'us-atlas/states-10m.json?url'
import { Button } from '../../../../components/button'
import { Container } from '../../../../components/container'
import { Icon } from '../../../../components/icon'
import { Stack } from '../../../../components/stack'
import { Stat, StatLabel, StatValue } from '../../../../components/stat'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import {
	AreaChart,
	BarChart,
	ChoroplethChart,
	ComboChart,
	DonutChart,
	HeatmapChart,
	LineChart,
	PieChart,
} from '../../../../modules/chart'
import type { MapGeography } from '../../../../modules/map'
import { code, Example } from '../../../engine'
import { activity, greens, heat, statePopulation } from './data'

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

const ChartContainer = ({ children, size }: { children: ReactNode; size?: number }) => (
	<Container size={size ?? 720} padding="none" center={false}>
		{children}
	</Container>
)

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
					<Tab value="choropleth">Choropleth</Tab>
					<Tab value="heatmap">Heatmap</Tab>
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
								code={code`<BarChart reference={[{ value: 55, label: 'Target', color: 'green' }, { value: 68, label: 'Ceiling', color: '#e11d48' }]} … />`}
							>
								<ChartContainer>
									<BarChart
										aria-label="Revenue by month against a target and ceiling"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
										reference={[
											{ value: 55, label: 'Target', color: 'green' },
											{ value: 68, label: 'Ceiling', color: '#e11d48' },
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
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
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
								<ChartContainer size={360}>
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
								<ChartContainer size={360}>
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
								<ChartContainer size={480}>
									<PieChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										labels={{ callouts: true }}
									/>
								</ChartContainer>
							</Example>

							<AnimatedExample title="Animated" source={code`<PieChart animate … />`}>
								<ChartContainer size={360}>
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
								<ChartContainer size={360}>
									<DonutChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
									/>
								</ChartContainer>
							</Example>

							<Example title="Center content" code={code`<DonutChart>…</DonutChart>`}>
								<ChartContainer size={360}>
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
								<ChartContainer size={360}>
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

					<TabContent value="heatmap">
						<Stack gap="xl">
							<Example
								title="Activity"
								code={code`<HeatmapChart series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: greens }]} … />`}
							>
								<ChartContainer>
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
										formatValue={(value) => `${value}`}
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
