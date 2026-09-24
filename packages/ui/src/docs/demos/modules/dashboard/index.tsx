import { useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { Flex } from '../../../../components/flex'
import { Spacer } from '../../../../components/spacer'
import { Stack } from '../../../../components/stack'
import { Stat, StatLabel, StatValue } from '../../../../components/stat'
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
import { Example } from '../../../engine'
import { fields, products, type Sale, sales, sumBy } from './data'
import { RegistryExample } from './registry'

const layout: DashboardLayoutItem[] = [
	{ id: 'regions', x: 0, y: 0, w: 12 },
	{ id: 'mix', x: 12, y: 0, w: 12 },
	{ id: 'units', x: 0, y: 27, w: 6, h: 16 },
	{ id: 'trend', x: 6, y: 27, w: 18, h: 30 },
	{ id: 'orders', x: 0, y: 57, w: 24, h: 44 },
]

const emptyFilter: QueryGroup = { id: 'filter', type: 'group', children: [] }

// Each tile below is ordinary app code. It reads the scope through a hook and
// hands rows to a widget; no widget knows that a dashboard holds it. A chart that
// selects also gets its own selection back, so the selected marks stay lit.

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

function Units() {
	const units = useDashboardRows(sales).reduce((sum, row) => sum + row.units, 0)

	return (
		<Stat>
			<StatLabel>Units sold</StatLabel>

			<StatValue>{units.toLocaleString()}</StatValue>
		</Stat>
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

const columns: GridColumn<Sale>[] = [
	{ id: 'month', title: 'Month', cell: (row) => row.month },
	{ id: 'region', title: 'Region', cell: (row) => row.region },
	{ id: 'product', title: 'Product', cell: (row) => row.product },
	{ id: 'units', title: 'Units', cell: (row) => row.units },
	{ id: 'revenue', title: 'Revenue', cell: (row) => row.revenue },
]

// The grid fills the tile and scrolls its own rows under a sticky header, so
// the tile keeps its size on the board.
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

						<Button color={editing ? 'zinc' : 'blue'} onClick={() => setEditing((live) => !live)}>
							{editing ? 'Done' : 'Edit layout'}
						</Button>
					</Flex>

					<Dashboard
						aria-label="Sales dashboard"
						editing={editing}
						layout={{ defaultValue: layout }}
						filter={{ value: filter, onValueChange: setFilter }}
						selection={{ value: selection, onValueChange: setSelection }}
					>
						<DashboardTile
							id="regions"
							title="Revenue by region"
							description="Click a bar to filter the other tiles"
							ratio={16 / 9}
						>
							<RevenueByRegion />
						</DashboardTile>

						<DashboardTile
							id="mix"
							title="Product mix"
							description="Click a slice to filter the other tiles"
							ratio={16 / 9}
						>
							<ProductMix />
						</DashboardTile>

						<DashboardTile id="units" title="Units" minWidth={160}>
							<Units />
						</DashboardTile>

						<DashboardTile
							id="trend"
							title="Revenue by month"
							actions={
								<Badge color="green" variant="soft">
									Live
								</Badge>
							}
						>
							<Trend />
						</DashboardTile>

						<DashboardTile id="orders" title="Orders" minWidth={480}>
							<Orders />
						</DashboardTile>
					</Dashboard>
				</Stack>
			</Example>

			<RegistryExample />
		</Stack>
	)
}
