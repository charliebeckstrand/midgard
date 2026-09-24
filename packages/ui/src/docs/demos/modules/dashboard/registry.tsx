import { ChevronDown, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Button } from '../../../../components/button'
import { Flex } from '../../../../components/flex'
import { Icon } from '../../../../components/icon'
import { JsonTree, type JsonValue } from '../../../../components/json-tree'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../../../components/menu'
import { Spacer } from '../../../../components/spacer'
import { Stack } from '../../../../components/stack'
import { Stat, StatLabel, StatValue } from '../../../../components/stat'
import { BarChart, LineChart } from '../../../../modules/chart'
import {
	Dashboard,
	type DashboardSpec,
	type DashboardSpecTile,
	DashboardTiles,
	type DashboardWidget,
	DashboardWidgetProvider,
	useDashboardRows,
	useDashboardScope,
} from '../../../../modules/dashboard'
import { Grid, type GridColumn } from '../../../../modules/grid'
import { Example } from '../../../engine'
import { type Sale, sales, sumBy } from './data'

/** The options of a bar tile: the field that the bars group by. */
type BarOptions = { by: 'region' | 'product' }

// Each widget is app code. It reads the scope through a hook, as a JSX tile does,
// and the registry below gives it a name that a spec can save.

function RevenueBars({ by }: BarOptions) {
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

function RevenueTrend() {
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

function Units() {
	const units = useDashboardRows(sales).reduce((sum, row) => sum + row.units, 0)

	return (
		<Stat>
			<StatLabel>Units sold</StatLabel>

			<StatValue>{units.toLocaleString()}</StatValue>
		</Stat>
	)
}

const columns: GridColumn<Sale>[] = [
	{ id: 'month', title: 'Month', cell: (row) => row.month },
	{ id: 'region', title: 'Region', cell: (row) => row.region },
	{ id: 'product', title: 'Product', cell: (row) => row.product },
	{ id: 'revenue', title: 'Revenue', cell: (row) => row.revenue },
]

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

// A module constant, so the registry keeps its identity, and a commit renders no
// spec tile again.
const widgets: Readonly<Record<string, DashboardWidget>> = {
	bar: {
		render: (tile) => <RevenueBars {...(tile.options as BarOptions)} />,
		ratio: 16 / 9,
		defaultSize: { w: 12 },
	},
	trend: { render: () => <RevenueTrend />, defaultSize: { w: 12, h: 27 } },
	stat: { render: () => <Units />, minWidth: 160, defaultSize: { w: 6, h: 16 } },
	orders: { render: () => <Orders />, minWidth: 480, defaultSize: { w: 24, h: 44 } },
}

/** What the "Add tile" menu offers: a kind, and the title and options of a new tile. */
const additions: Omit<DashboardSpecTile, 'id'>[] = [
	{ widget: 'bar', title: 'Revenue by region', options: { by: 'region' } },
	{ widget: 'bar', title: 'Revenue by product', options: { by: 'product' } },
	{ widget: 'trend', title: 'Revenue by month' },
	{ widget: 'stat', title: 'Units' },
	{ widget: 'orders', title: 'Orders' },
]

// The saved board. The "forecast" kind is not registered, as for a board that
// outlives a widget: its tile keeps its place and states the gap.
const saved: DashboardSpec = {
	tiles: [
		{ id: 'tile-1', widget: 'bar', title: 'Revenue by region', options: { by: 'region' } },
		{ id: 'tile-2', widget: 'stat', title: 'Units' },
		{ id: 'tile-3', widget: 'forecast', title: 'Forecast', description: 'Not registered' },
	],
	layout: [
		{ id: 'tile-1', x: 0, y: 0, w: 12 },
		{ id: 'tile-2', x: 12, y: 0, w: 6, h: 16 },
		{ id: 'tile-3', x: 18, y: 0, w: 6, h: 16 },
	],
}

export function RegistryExample() {
	const [spec, setSpec] = useState(saved)

	const [editing, setEditing] = useState(false)

	const next = useRef(saved.tiles.length + 1)

	const add = (tile: Omit<DashboardSpecTile, 'id'>) => {
		const id = `tile-${next.current++}`

		setSpec((current) => ({ ...current, tiles: [...current.tiles, { ...tile, id }] }))
	}

	// A remove drops the layout entry too, so its space does not stay open.
	const actions = useCallback(
		(tile: DashboardSpecTile) => (
			<Button
				variant="plain"
				aria-label={`Remove ${tile.title ?? tile.id}`}
				onClick={() =>
					setSpec((current) => ({
						...current,
						tiles: current.tiles.filter((item) => item.id !== tile.id),
						layout: current.layout.filter((item) => item.id !== tile.id),
					}))
				}
			>
				<Icon icon={<X />} size="sm" />
			</Button>
		),
		[],
	)

	// The spec as it saves: a round trip through JSON changes nothing.
	const json = useMemo<JsonValue>(() => JSON.parse(JSON.stringify(spec)), [spec])

	return (
		<Example title="Widget registry">
			<Stack gap="md">
				<Flex gap="sm" align="center">
					<Menu placement="bottom-start">
						<MenuTrigger>
							<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
								Add tile
							</Button>
						</MenuTrigger>

						<MenuContent>
							{additions.map((tile) => (
								<MenuItem key={tile.title} onAction={() => add(tile)}>
									<MenuLabel>{tile.title}</MenuLabel>
								</MenuItem>
							))}
						</MenuContent>
					</Menu>

					<Spacer />

					<Button color={editing ? 'zinc' : 'blue'} onClick={() => setEditing((live) => !live)}>
						{editing ? 'Done' : 'Edit layout'}
					</Button>
				</Flex>

				<DashboardWidgetProvider widgets={widgets}>
					<Dashboard
						aria-label="Saved dashboard"
						editing={editing}
						layout={{
							value: spec.layout,
							onValueChange: (layout) => setSpec((current) => ({ ...current, layout })),
						}}
					>
						<DashboardTiles tiles={spec.tiles} actions={actions} />
					</Dashboard>
				</DashboardWidgetProvider>

				<JsonTree data={json} rootKey="spec" defaultExpandDepth={1} />
			</Stack>
		</Example>
	)
}
