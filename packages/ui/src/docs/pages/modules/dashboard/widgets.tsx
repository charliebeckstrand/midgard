import { useLayoutEffect, useMemo } from 'react'
import { BarChart, DonutChart, LineChart } from 'ui/chart'
import { useDashboardRows, useDashboardScope } from 'ui/dashboard'
import { Flex } from 'ui/flex'
import { Grid, type GridColumn } from 'ui/grid'
import { useContentHeightHost } from 'ui/primitives/content-height'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Stat, StatDelta, StatDescription, StatValue } from 'ui/stat'
import { PointerHint } from '../../../kit/pointer-hint.tsx'
import { products, type Sale, sales, sumBy } from './data.ts'

// Revenue is an amount in whole dollars.
const dollars = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const

/** The hint names the gesture of the pointer that the device has. A tap on a touch screen selects. */
export function FilterHint({ mark }: { mark: 'bar' | 'slice' }) {
	return (
		<PointerHint
			mouse={`Click a ${mark} to filter the other tiles`}
			touch={`Tap a ${mark} to filter the other tiles`}
		/>
	)
}

export type RevenueBarsProps = { by: 'region' | 'product' }

export function RevenueBars({ by }: RevenueBarsProps) {
	const scope = useDashboardScope()

	const data = sumBy(useDashboardRows(sales), by, 'revenue')

	return (
		<BarChart
			aria-label={`Revenue by ${by}`}
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
			series={[{ xKey: 'key', yKey: 'total' }]}
			aspectRatio={false}
			categories={products}
			selectedCategories={scope.selected('product')}
			onCategoryClick={(product) => scope.select('product', product)}
		/>
	)
}

// On a narrow board, a stat tile claims the height of its content, so that only
// the page scrolls. The trend then gets a fixed height, because a chart that
// fills its box has no height of its own.
function useStatFlow() {
	const host = useContentHeightHost()

	const flow = host?.available === true

	useLayoutEffect(() => (flow ? host?.claim() : undefined), [flow, host])

	return {
		root: flow ? undefined : 'size-full',
		trend: flow ? 'h-20' : 'min-h-0 flex-1',
	}
}

export function Units() {
	const { formatNumber } = useIntl()

	const rows = useDashboardRows(sales)

	const units = rows.reduce((sum, row) => sum + row.units, 0)

	const data = sumBy(rows, 'month', 'units')

	const flow = useStatFlow()

	return (
		<Stack gap="sm" className={flow.root}>
			<Stat className="h-auto">
				<Flex align="baseline" gap="sm" wrap>
					<StatValue size="sm">{formatNumber(units)}</StatValue>
					<StatDescription>in {data.length} months</StatDescription>
				</Flex>
			</Stat>
			<div className={flow.trend}>
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

	const name = value === 'units' ? 'Units' : 'Revenue'

	const total = latest ? formatNumber(latest.total, value === 'revenue' ? dollars : undefined) : '–'

	const percent = formatNumber(Math.abs(change), {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})

	const flow = useStatFlow()

	return (
		<Stack gap="sm" className={flow.root}>
			<Stat className="h-auto">
				<Flex align="baseline" gap="sm" wrap>
					<StatValue size="sm">{total}</StatValue>
					<StatDelta trend={trend}>
						{arrows[trend]} {percent} vs {prev?.key ?? 'last month'}
					</StatDelta>
				</Flex>
			</Stat>
			<div className={flow.trend}>
				<LineChart
					aria-label={`${name} by month`}
					data={data}
					series={[{ xKey: 'key', yKey: 'total', yName: name }]}
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
