import { useMemo } from 'react'
import { BarChart, DonutChart, LineChart } from 'ui/chart'
import { useDashboardRows, useDashboardScope } from 'ui/dashboard'
import { Flex } from 'ui/flex'
import { Grid, type GridColumn } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Stat, StatDelta, StatDescription, StatValue } from 'ui/stat'
import { PointerHint } from '../../../kit/pointer-hint.tsx'
import { products, type Sale, sales, sumBy } from './data.ts'

// Revenue is an amount in whole dollars.
const dollars = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const

/** The hint names the gesture of the pointer that the device has. A tap on a touch screen selects. */
export function FilterHint({ mark }: { mark: 'bar' | 'slice' }) {
	return mark === 'bar' ? (
		<PointerHint
			mouseText="Click a bar to filter the other tiles"
			touchText="Tap a bar to filter the other tiles"
		/>
	) : (
		<PointerHint
			mouseText="Click a slice to filter the other tiles"
			touchText="Tap a slice to filter the other tiles"
		/>
	)
}

export type RevenueBarsProps = { by: 'region' | 'product' }

export function RevenueBars({ by }: RevenueBarsProps) {
	const scope = useDashboardScope()

	const data = sumBy(useDashboardRows(sales), by, 'revenue')

	return (
		<BarChart
			aria-label={by === 'region' ? 'Revenue by region' : 'Revenue by product'}
			data={data}
			series={[{ xKey: 'key', yKey: 'total', yName: 'Revenue' }]}
			aspectRatio={false}
			selectedCategories={scope.selected(by)}
			onCategoryClick={(value) => scope.select(by, value)}
		/>
	)
}

export function ProductMix() {
	const scope = useDashboardScope()

	const data = sumBy(useDashboardRows(sales), 'product', 'revenue')

	return (
		<DonutChart
			aria-label="Revenue by product"
			data={data}
			series={[{ xKey: 'key', yKey: 'total', yName: 'Revenue' }]}
			aspectRatio={false}
			categories={products}
			selectedCategories={scope.selected('product')}
			onCategoryClick={(product) => scope.select('product', product)}
		/>
	)
}

// A stat tile takes the height of its content on a narrow board (`fitContent`).
// The trend starts at 5rem and grows into the room of a fixed tile, so the same
// markup fills a tile of fixed height and sets the height of a tile in the flow.
const stat = { root: 'size-full', trend: 'min-h-0 flex-[1_1_5rem]' }

export function Units() {
	const { formatNumber } = useIntl()

	const rows = useDashboardRows(sales)

	const units = rows.reduce((sum, row) => sum + row.units, 0)

	const data = sumBy(rows, 'month', 'units')

	return (
		<Stack gap="sm" className={stat.root}>
			<Stat className="h-auto">
				<Flex align="baseline" gap="sm" wrap>
					<StatValue size="sm">{formatNumber(units)}</StatValue>
					<StatDescription>in {data.length} months</StatDescription>
				</Flex>
			</Stat>
			<div className={stat.trend}>
				<BarChart
					aria-label="Units sold by month"
					data={data}
					series={[{ xKey: 'key', yKey: 'total', yName: 'Units' }]}
					aspectRatio={false}
				/>
			</div>
		</Stack>
	)
}

export function Trend() {
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

export type KpiProps = { value: 'revenue' | 'units' }

const arrows = { up: '↑', down: '↓', neutral: '→' } as const

export function Kpi({ value }: KpiProps) {
	const { formatNumber } = useIntl()

	const data = sumBy(useDashboardRows(sales), 'month', value)

	const latest = data.at(-1)

	const prev = data.at(-2)

	const change = latest && prev?.total ? (latest.total - prev.total) / prev.total : 0

	const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'

	const total = latest ? formatNumber(latest.total, value === 'revenue' ? dollars : undefined) : '–'

	const percent = formatNumber(Math.abs(change), {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})

	return (
		<Stack gap="sm" className={stat.root}>
			<Stat className="h-auto">
				<Flex align="baseline" gap="sm" wrap>
					<StatValue size="sm">{total}</StatValue>
					<StatDelta trend={trend}>
						{arrows[trend]} {percent} vs {prev?.key ?? 'last month'}
					</StatDelta>
				</Flex>
			</Stat>
			<div className={stat.trend}>
				<LineChart
					aria-label={value === 'units' ? 'Units by month' : 'Revenue by month'}
					data={data}
					series={[{ xKey: 'key', yKey: 'total', yName: value === 'units' ? 'Units' : 'Revenue' }]}
					aspectRatio={false}
				/>
			</div>
		</Stack>
	)
}

// The grid fills the tile and scrolls its rows under a sticky header. On a
// narrow board, the grid shows pages of 10 rows, and the tile grows to hold them.
export function Orders() {
	const { formatNumber } = useIntl()

	const columns = useMemo<GridColumn<Sale>[]>(
		() => [
			{ id: 'month', title: 'Month', cell: (row) => row.month },
			{ id: 'region', title: 'Region', cell: (row) => row.region },
			{ id: 'product', title: 'Product', cell: (row) => row.product },
			{ id: 'units', title: 'Units', cell: (row) => row.units },
			{ id: 'revenue', title: 'Revenue', cell: (row) => formatNumber(row.revenue, dollars) },
		],
		[formatNumber],
	)

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
