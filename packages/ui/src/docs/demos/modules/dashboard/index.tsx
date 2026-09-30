import { useCallback, useLayoutEffect, useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { Stat, StatDelta, StatDescription, StatValue } from '../../../../components/stat'
import { BarChart, DonutChart, LineChart } from '../../../../modules/chart'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardSelection,
	DashboardTile,
	useDashboardRows,
	useDashboardScope,
} from '../../../../modules/dashboard'
import { Grid, type GridColumn } from '../../../../modules/grid'
import { QueryBuilder, type QueryGroup, QuerySummary } from '../../../../modules/query'
import { useContentHeightHost } from '../../../../primitives/content-height'
import { Flex } from '../../../../structure/flex'
import { Spacer } from '../../../../structure/spacer'
import { Stack } from '../../../../structure/stack'
import { Example } from '../../../engine'
import { fields, products, type Sale, sales, sumBy } from './data'
import { RegistryExample } from './registry'

const layout: DashboardLayoutItem[] = [
	{ id: 'units-trend', x: 0, y: 0, w: 8, h: 20 },
	{ id: 'revenue-trend', x: 8, y: 0, w: 8, h: 20 },
	{ id: 'units', x: 16, y: 0, w: 8, h: 20 },
	{ id: 'regions', x: 0, y: 20, w: 12 },
	{ id: 'mix', x: 12, y: 20, w: 12 },
	{ id: 'trend', x: 0, y: 47, w: 24, h: 40 },
	{ id: 'orders', x: 0, y: 87, w: 24, h: 44 },
]

const emptyFilter: QueryGroup = { id: 'filter', type: 'group', children: [] }

// Each tile below is ordinary app code. It reads the scope through a hook and
// hands rows to a widget; no widget knows that a dashboard holds it. A chart that
// selects also gets its own selection back, so the selected marks stay lit.

// On a touch screen, a tap selects and a hold reads the chart.
// The hint names the gesture of the pointer that the device has.
function FilterHint({ mark }: { mark: 'bar' | 'slice' }) {
	return (
		<>
			<span className="pointer-coarse:hidden">Click</span>
			<span className="hidden pointer-coarse:inline">Tap</span> a {mark} to filter the other tiles
		</>
	)
}

function RevenueByRegion() {
	const scope = useDashboardScope()

	const data = sumBy(useDashboardRows(sales), 'region', 'revenue')

	return (
		<BarChart
			aria-label="Revenue by region"
			data={data}
			series={[{ xKey: 'key', yKey: 'total', yName: 'Revenue' }]}
			aspectRatio={false}
			selectedCategories={scope.selected('region')}
			onCategoryClick={(region) => scope.select('region', region)}
		/>
	)
}

function ProductMix() {
	const scope = useDashboardScope()

	const data = sumBy(useDashboardRows(sales), 'product', 'revenue')

	return (
		<DonutChart
			aria-label="Revenue by product"
			data={data}
			series={[{ xKey: 'key', yKey: 'total' }]}
			aspectRatio={false}
			categories={products}
			selectedCategories={scope.selected('product')}
			onCategoryClick={(product) => scope.select('product', product)}
		/>
	)
}

// On a narrow board, a stat tile claims the height of its content, so its value,
// its change, and its trend all show and only the page scrolls. The trend then
// takes a fixed height, because a chart that fills its box has no height of its own.
function useStatFlow() {
	const host = useContentHeightHost()

	const flow = host?.available === true

	useLayoutEffect(() => (flow ? host?.claim() : undefined), [flow, host])

	return {
		root: flow ? 'flex flex-col gap-2' : 'flex size-full flex-col gap-2',
		trend: flow ? 'h-20' : 'min-h-0 flex-1',
	}
}

// A stat tile can add a trend under its value. The trend is optional, and it
// takes the height that the value leaves free.
function Units() {
	const rows = useDashboardRows(sales)

	const units = rows.reduce((sum, row) => sum + row.units, 0)

	const data = sumBy(rows, 'month', 'units')

	const flow = useStatFlow()

	return (
		<div className={flow.root}>
			<Stat className="h-auto flex-row flex-wrap items-baseline justify-start gap-x-2">
				<StatValue size="sm">{units.toLocaleString()}</StatValue>

				<StatDescription>in {data.length} months</StatDescription>
			</Stat>

			<div className={flow.trend}>
				<BarChart
					aria-label="Units sold by month"
					data={data}
					series={[{ xKey: 'key', yKey: 'total', yName: 'Units' }]}
					aspectRatio={false}
				/>
			</div>
		</div>
	)
}

function Trend() {
	const data = sumBy(useDashboardRows(sales), 'month', 'revenue')

	return (
		<LineChart
			aria-label="Revenue by month"
			data={data}
			series={[{ xKey: 'key', yKey: 'total', yName: 'Revenue' }]}
			aspectRatio={false}
		/>
	)
}

// A KPI tile leads with its latest value and the change from the month before,
// and the sparkline under them shows the trend. The narrow chart takes the spark
// tier, and the tile keeps its title in the header row.
function Kpi({ value }: { value: 'revenue' | 'units' }) {
	const data = sumBy(useDashboardRows(sales), 'month', value)

	const latest = data.at(-1)

	const previous = data.at(-2)

	const change = latest && previous?.total ? (latest.total - previous.total) / previous.total : 0

	const name = value === 'units' ? 'Units' : 'Revenue'

	const flow = useStatFlow()

	return (
		<div className={flow.root}>
			<Stat className="h-auto flex-row flex-wrap items-baseline justify-start gap-x-2">
				<StatValue size="sm">{latest?.total.toLocaleString() ?? '–'}</StatValue>

				<StatDelta trend={change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'}>
					{change > 0 ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change * 100).toFixed(1)}% vs{' '}
					{previous?.key ?? 'last month'}
				</StatDelta>
			</Stat>

			<div className={flow.trend}>
				<LineChart
					aria-label={`${name} by month`}
					data={data}
					series={[{ xKey: 'key', yKey: 'total', yName: name }]}
					aspectRatio={false}
				/>
			</div>
		</div>
	)
}

const columns: GridColumn<Sale>[] = [
	{ id: 'month', title: 'Month', cell: (row) => row.month },
	{ id: 'region', title: 'Region', cell: (row) => row.region },
	{ id: 'product', title: 'Product', cell: (row) => row.product },
	{ id: 'units', title: 'Units', cell: (row) => row.units },
	{ id: 'revenue', title: 'Revenue', cell: (row) => row.revenue },
]

// The grid fills the tile and scrolls its own rows under a sticky header, so
// the tile keeps its size on the board. On a narrow board the grid shows pages
// of 10 rows instead, and the tile grows to hold them. `pagination={false}`
// keeps the scroll region there too.
function Orders() {
	return (
		<Grid
			columns={columns}
			rows={useDashboardRows(sales)}
			getKey={(row) => row.id}
			header={{ position: 'sticky' }}
			maxHeight="fill"
		/>
	)
}

export function Demo() {
	const [editing, setEditing] = useState(false)

	// A narrow board paints the re-pack, where edit mode stands down. The control
	// that starts it then hides, and a live edit ends.
	const [projected, setProjected] = useState(false)

	const project = useCallback((next: boolean) => {
		setProjected(next)

		if (next) setEditing(false)
	}, [])

	const [filter, setFilter] = useState<QueryGroup>(emptyFilter)

	const [selection, setSelection] = useState<DashboardSelection[]>([])

	return (
		<Stack gap="lg">
			<Example title="Dashboard">
				<Stack gap="md">
					<QueryBuilder fields={fields} value={filter} onValueChange={setFilter} />

					<Flex gap="sm" align="center">
						<QuerySummary value={filter} fields={fields} />

						{selection.map((item) => (
							<Badge key={`${item.source}:${item.field}`}>
								{item.field}: {item.values.join(', ')}
							</Badge>
						))}

						<Spacer />

						{selection.length > 0 && (
							<Button variant="plain" onClick={() => setSelection([])}>
								Clear selection
							</Button>
						)}

						<Button
							color={editing ? 'zinc' : 'blue'}
							hidden={projected}
							onClick={() => setEditing((live) => !live)}
						>
							{editing ? 'Done' : 'Edit layout'}
						</Button>
					</Flex>

					<Dashboard
						aria-label="Sales dashboard"
						editing={editing}
						onProjectedChange={project}
						layout={{ defaultValue: layout }}
						filter={{ value: filter, onValueChange: setFilter }}
						selection={{ value: selection, onValueChange: setSelection }}
					>
						<DashboardTile
							id="regions"
							expandable
							title="Revenue by region"
							description={<FilterHint mark="bar" />}
							ratio={16 / 9}
						>
							<RevenueByRegion />
						</DashboardTile>

						<DashboardTile
							id="mix"
							expandable
							title="Product mix"
							description={<FilterHint mark="slice" />}
							ratio={16 / 9}
						>
							<ProductMix />
						</DashboardTile>

						<DashboardTile id="units" title="Units sold" minWidth={160}>
							<Units />
						</DashboardTile>

						<DashboardTile id="units-trend" expandable title="Monthly units" minWidth={200}>
							<Kpi value="units" />
						</DashboardTile>

						<DashboardTile id="revenue-trend" expandable title="Monthly revenue" minWidth={200}>
							<Kpi value="revenue" />
						</DashboardTile>

						<DashboardTile
							id="trend"
							expandable
							title="Revenue by month"
							actions={
								<Badge color="green" variant="soft">
									Live
								</Badge>
							}
						>
							<Trend />
						</DashboardTile>

						<DashboardTile id="orders" expandable title="Orders" minWidth={480}>
							<Orders />
						</DashboardTile>
					</Dashboard>
				</Stack>
			</Example>

			<RegistryExample />
		</Stack>
	)
}
