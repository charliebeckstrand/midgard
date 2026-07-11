import { useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { Flex } from '../../../../components/flex'
import { Spacer } from '../../../../components/spacer'
import { Stack } from '../../../../components/stack'
import { AreaChart, BarChart, ComboChart, DonutChart, LineChart } from '../../../../modules/chart'
import {
	DashboardGrid,
	DashboardItem,
	type DashboardLayoutItem,
} from '../../../../modules/dashboard'
import { Example } from '../../../engine'

type Month = { month: string; revenue: number; costs: number; margin: number }

const months: Month[] = [
	{ month: 'Jan', revenue: 42, costs: 28, margin: 14 },
	{ month: 'Feb', revenue: 51, costs: 30, margin: 21 },
	{ month: 'Mar', revenue: 47, costs: 33, margin: 14 },
	{ month: 'Apr', revenue: 63, costs: 35, margin: 28 },
	{ month: 'May', revenue: 58, costs: 34, margin: 24 },
	{ month: 'Jun', revenue: 71, costs: 38, margin: 33 },
]

const sources = [
	{ source: 'Search', visits: 4820 },
	{ source: 'Direct', visits: 2210 },
	{ source: 'Referral', visits: 1370 },
	{ source: 'Social', visits: 940 },
]

// One full-width row, then a three-up row of equal 16:9 tiles — the
// equal-heights guarantee on display.
const LAYOUT: DashboardLayoutItem[] = [
	{ id: 'revenue', x: 0, y: 0, w: 12 },
	{ id: 'traffic', x: 12, y: 0, w: 12 },
	{ id: 'orders', x: 0, y: 27, w: 8 },
	{ id: 'costs', x: 8, y: 27, w: 8 },
	{ id: 'margin', x: 16, y: 27, w: 8 },
	{ id: 'repacking', x: 0, y: 45, w: 24 },
]

export function Demo() {
	const [editing, setEditing] = useState(false)

	return (
		<Stack gap="lg">
			<Example title="Dashboard">
				<Stack gap="md">
					<Flex gap="sm" align="center">
						<Spacer />

						{/* {editing && <Button color="blue">Add</Button>} */}

						<Button onClick={() => setEditing((live) => !live)}>
							{editing ? 'Done' : 'Edit layout'}
						</Button>
					</Flex>

					<DashboardGrid
						aria-label="Sales dashboard"
						editing={editing}
						layout={{ defaultValue: LAYOUT }}
					>
						<DashboardItem id="revenue" ratio={16 / 9}>
							<BarChart
								aria-label="Revenue and costs by month"
								header={{ title: 'Revenue', suffix: <Badge>Live</Badge> }}
								data={months}
								series={[
									{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
									{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
								]}
								aspectRatio={false}
							/>
						</DashboardItem>

						<DashboardItem id="traffic" ratio={16 / 9}>
							<DonutChart
								aria-label="Traffic by source"
								header="Traffic"
								data={sources}
								series={[{ xKey: 'source', yKey: 'visits' }]}
								aspectRatio={false}
							/>
						</DashboardItem>

						<DashboardItem id="orders" ratio={16 / 9}>
							<LineChart
								aria-label="Margin by month"
								header="Margin"
								data={months}
								series={[{ xKey: 'month', yKey: 'margin', yName: 'Margin' }]}
								aspectRatio={false}
							/>
						</DashboardItem>

						<DashboardItem id="costs" ratio={16 / 9}>
							<AreaChart
								aria-label="Costs by month"
								header="Costs"
								data={months}
								series={[{ xKey: 'month', yKey: 'costs', yName: 'Costs' }]}
								aspectRatio={false}
							/>
						</DashboardItem>

						<DashboardItem id="margin" ratio={16 / 9}>
							<BarChart
								aria-label="Margin by month, as bars"
								header="Margin, stacked"
								data={months}
								series={[
									{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
									{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
								]}
								stacked
								aspectRatio={false}
							/>
						</DashboardItem>

						<DashboardItem id="repacking" ratio={16 / 9}>
							<ComboChart
								aria-label="Revenue, costs, and margin by month"
								header="Repacking"
								data={months}
								series={[
									{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', type: 'bar' },
									{ xKey: 'month', yKey: 'costs', yName: 'Costs', type: 'bar' },
									{ xKey: 'month', yKey: 'margin', yName: 'Margin', type: 'line' },
								]}
								aspectRatio={false}
							/>
						</DashboardItem>
					</DashboardGrid>
				</Stack>
			</Example>
		</Stack>
	)
}
