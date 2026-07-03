import { RefreshCw } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Stack } from '../../../../components/stack'
import { Stat, StatLabel, StatValue } from '../../../../components/stat'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import { AreaChart, BarChart, ComboChart, LineChart, PieChart } from '../../../../modules/chart'
import { code, Example } from '../../../engine'

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

const budget = months.map((entry) => ({
	month: entry.month,
	revenue: entry.revenue * 1000,
	costs: entry.costs * 1000,
}))

const usd = new Intl.NumberFormat(undefined, {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 0,
})

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
					variant="plain"
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
	return (
		<Tabs defaultValue="bar">
			<Stack gap="lg">
				<TabList aria-label="Chart kind">
					<Tab value="bar">Bar</Tab>
					<Tab value="line">Line</Tab>
					<Tab value="area">Area</Tab>
					<Tab value="pie">Pie</Tab>
					<Tab value="combo">Combo</Tab>
				</TabList>
				<TabContents>
					<TabContent value="bar">
						<Stack gap="xl">
							<Example title="Grouped">
								<BarChart
									aria-label="Revenue and costs by month"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'costs', label: 'Costs' },
									]}
								/>
							</Example>

							<Example title="Negative values">
								<BarChart
									aria-label="Month-over-month swing"
									data={swings}
									x="month"
									series={[{ key: 'delta', label: 'Swing' }]}
								/>
							</Example>

							<Example
								title="Formatted values"
								code={code`<BarChart formatValue={(value) => usd.format(value)} … />`}
							>
								<BarChart
									aria-label="Budget by month in dollars"
									data={budget}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'costs', label: 'Costs' },
									]}
									formatValue={(value) => usd.format(value)}
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<BarChart animate … />`}>
								<BarChart
									aria-label="Revenue and costs by month, animated"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'costs', label: 'Costs' },
									]}
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="line">
						<Stack gap="xl">
							<Example title="Multi-series">
								<LineChart
									aria-label="Revenue and margin by month"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'margin', label: 'Margin' },
									]}
								/>
							</Example>

							<Example title="Area wash & points" code={code`<LineChart fill points … />`}>
								<LineChart
									aria-label="Revenue by month"
									data={months}
									x="month"
									series={[{ key: 'revenue', label: 'Revenue' }]}
									fill
									points
								/>
							</Example>

							<Example
								title="Smooth interpolation"
								code={code`<LineChart interpolation="smooth" … />`}
							>
								<LineChart
									aria-label="Revenue and margin by month, smoothed"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'margin', label: 'Margin' },
									]}
									interpolation="smooth"
									points
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<LineChart animate … />`}>
								<LineChart
									aria-label="Revenue and margin by month, animated"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'margin', label: 'Margin' },
									]}
									fill
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="area">
						<Stack gap="xl">
							<Example title="Stacked" code={code`<AreaChart stacked … />`}>
								<AreaChart
									aria-label="Revenue and costs by month, stacked"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'costs', label: 'Costs' },
									]}
									stacked
								/>
							</Example>

							<Example
								title="Overlapping, smoothed"
								code={code`<AreaChart interpolation="smooth" … />`}
							>
								<AreaChart
									aria-label="Revenue and margin by month"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'margin', label: 'Margin' },
									]}
									interpolation="smooth"
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<AreaChart stacked animate … />`}>
								<AreaChart
									aria-label="Revenue and costs by month, stacked and animated"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'costs', label: 'Costs' },
									]}
									stacked
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="pie">
						<Stack gap="xl">
							<Example title="Pie with segment labels" code={code`<PieChart segmentLabels … />`}>
								<PieChart
									aria-label="Traffic by source"
									data={sources}
									value="visits"
									label="source"
									segmentLabels
								/>
							</Example>

							<Example title="Donut with center content" code={code`<PieChart donut>…</PieChart>`}>
								<PieChart
									aria-label="Traffic by source"
									data={sources}
									value="visits"
									label="source"
									donut
								>
									<Stat>
										<StatLabel>Total visits</StatLabel>
										<StatValue>9,340</StatValue>
									</Stat>
								</PieChart>
							</Example>

							<AnimatedExample title="Animated" source={code`<PieChart animate … />`}>
								<PieChart
									aria-label="Traffic by source, animated"
									data={sources}
									value="visits"
									label="source"
									donut
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="combo">
						<Stack gap="xl">
							<Example title="Bars behind a line, one axis">
								<ComboChart
									aria-label="Revenue bars with margin line by month"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue', type: 'bar' },
										{ key: 'margin', label: 'Margin', type: 'line' },
									]}
								/>
							</Example>

							<AnimatedExample title="Animated" source={code`<ComboChart animate … />`}>
								<ComboChart
									aria-label="Revenue bars with margin line by month, animated"
									data={months}
									x="month"
									series={[
										{ key: 'revenue', label: 'Revenue', type: 'bar' },
										{ key: 'margin', label: 'Margin', type: 'line' },
									]}
									animate
								/>
							</AnimatedExample>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
