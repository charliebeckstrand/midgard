import { RefreshCw } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Stack } from '../../../../components/stack'
import { Stat, StatLabel, StatValue } from '../../../../components/stat'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import {
	AreaChart,
	BarChart,
	ComboChart,
	DonutChart,
	LineChart,
	PieChart,
} from '../../../../modules/chart'
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

const Container = ({ children, size = 'lg' }: { children: ReactNode; size?: string }) => {
	const sizeMap: Record<string, string> = {
		sm: 'sm:max-w-sm',
		md: 'md:max-w-md',
		lg: 'lg:max-w-lg',
	}

	return <div className={size ? `${sizeMap[size]}` : undefined}>{children}</div>
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
					<Tab value="donut">Donut</Tab>
					<Tab value="combo">Combo</Tab>
				</TabList>
				<TabContents>
					<TabContent value="bar">
						<Stack gap="xl">
							<Example title="Grouped" code={code`<BarChart … />`}>
								<Container>
									<BarChart
										aria-label="Revenue and costs by month"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
									/>
								</Container>
							</Example>

							<Example title="Negative values" code={code`<BarChart crosshair … />`}>
								<Container>
									<BarChart
										aria-label="Month-over-month swing"
										data={swings}
										series={[{ xKey: 'month', yKey: 'delta', yName: 'Swing' }]}
										crosshair
									/>
								</Container>
							</Example>

							<Example
								title="Formatted values"
								code={code`<BarChart formatValue={(value) => usd.format(value)} … />`}
							>
								<Container>
									<BarChart
										aria-label="Budget by month in dollars"
										data={budget}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
										formatValue={(value) => usd.format(value)}
									/>
								</Container>
							</Example>

							<AnimatedExample title="Animated" source={code`<BarChart animate … />`}>
								<Container>
									<BarChart
										aria-label="Revenue and costs by month, animated"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
										animate
									/>
								</Container>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="line">
						<Stack gap="xl">
							<Example title="Single-series" code={code`<LineChart … />`}>
								<Container>
									<LineChart
										aria-label="Revenue by month"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
									/>
								</Container>
							</Example>

							<Example title="Multi-series" code={code`<LineChart crosshair={{ snap: true }} … />`}>
								<Container>
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
								</Container>
							</Example>

							<Example title="Points" code={code`<LineChart fill points … />`}>
								<Container>
									<LineChart
										aria-label="Revenue by month"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
										points
									/>
								</Container>
							</Example>

							<Example
								title="Smooth interpolation"
								code={code`<LineChart interpolation="smooth" … />`}
							>
								<Container>
									<LineChart
										aria-label="Revenue and margin by month, smoothed"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
										]}
										interpolation="smooth"
									/>
								</Container>
							</Example>

							<Example title="Fill" code={code`<LineChart fill … />`}>
								<Container>
									<LineChart
										aria-label="Revenue by month"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
										fill
									/>
								</Container>
							</Example>

							<AnimatedExample title="Animated" source={code`<LineChart animate … />`}>
								<Container>
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
								</Container>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="area">
						<Stack gap="xl">
							<Example title="Single-series" code={code`<AreaChart … />`}>
								<Container>
									<AreaChart
										aria-label="Revenue by month"
										data={months}
										series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: 'orange' }]}
									/>
								</Container>
							</Example>

							<Example title="Stacked" code={code`<AreaChart stacked … />`}>
								<Container>
									<AreaChart
										aria-label="Revenue and costs by month, stacked"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
										]}
										stacked
									/>
								</Container>
							</Example>

							<Example
								title="Smooth interpolation"
								code={code`<AreaChart interpolation="smooth" crosshair={{ x: false, y: true }} … />`}
							>
								<Container>
									<AreaChart
										aria-label="Revenue and margin by month"
										data={months}
										series={[
											{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
										]}
										interpolation="smooth"
										crosshair={{ x: false, y: true }}
										points
									/>
								</Container>
							</Example>

							<AnimatedExample title="Animated" source={code`<AreaChart stacked animate … />`}>
								<Container>
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
								</Container>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="pie">
						<Stack gap="xl">
							<Example title="No labels" code={code`<PieChart … />`}>
								<Container size="sm">
									<PieChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
									/>
								</Container>
							</Example>

							<Example
								title="Segment labels"
								code={code`<PieChart labels={{ segment: true }} legend={false} … />`}
							>
								<Container size="sm">
									<PieChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										labels={{ segment: true }}
									/>
								</Container>
							</Example>

							<Example
								title="Callout labels"
								code={code`<PieChart labels={{ callouts: true }} … />`}
							>
								<Container>
									<PieChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										labels={{ callouts: true }}
									/>
								</Container>
							</Example>

							<AnimatedExample title="Animated" source={code`<PieChart animate … />`}>
								<Container size="sm">
									<PieChart
										aria-label="Traffic by source, animated"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										animate
									/>
								</Container>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="donut">
						<Stack gap="xl">
							<Example title="Basic" code={code`<DonutChart>`}>
								<Container size="sm">
									<DonutChart
										aria-label="Traffic by source"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
									/>
								</Container>
							</Example>

							<Example title="Center content" code={code`<DonutChart>…</DonutChart>`}>
								<Container size="sm">
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
								</Container>
							</Example>

							<AnimatedExample title="Animated" source={code`<DonutChart animate … />`}>
								<Container size="sm">
									<DonutChart
										aria-label="Traffic by source, animated"
										data={sources}
										series={[{ xKey: 'source', yKey: 'visits' }]}
										animate
									/>
								</Container>
							</AnimatedExample>
						</Stack>
					</TabContent>

					<TabContent value="combo">
						<Stack gap="xl">
							<Example
								title="Bar and line"
								code={code`<ComboChart crosshair={{ snap: true }} … />`}
							>
								<Container>
									<ComboChart
										aria-label="Revenue bars with margin line by month"
										data={months}
										series={[
											{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
										]}
										crosshair={{ snap: true }}
									/>
								</Container>
							</Example>

							<AnimatedExample title="Animated" source={code`<ComboChart animate … />`}>
								<Container>
									<ComboChart
										aria-label="Revenue bars with margin line by month, animated"
										data={months}
										series={[
											{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
											{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
										]}
										animate
									/>
								</Container>
							</AnimatedExample>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
