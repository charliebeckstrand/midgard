import { ChevronDown, Plus } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { JsonTree, type JsonValue } from '../../../../components/json-tree'
import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuItem,
	MenuLabel,
	MenuTrigger,
} from '../../../../components/menu'
import { Select, SelectDescription, SelectLabel, SelectOption } from '../../../../components/select'
import { Stat, StatDelta, StatDescription, StatValue } from '../../../../components/stat'
import { Text } from '../../../../components/text'
import { BarChart, DonutChart, LineChart } from '../../../../modules/chart'
import {
	addSpecTile,
	Dashboard,
	type DashboardHandle,
	type DashboardLayoutItem,
	type DashboardPreset,
	type DashboardSelection,
	type DashboardSpec,
	type DashboardSpecTile,
	DashboardTile,
	DashboardTiles,
	type DashboardWidget,
	DashboardWidgetProvider,
	duplicateSpecTile,
	nextSpecTileId,
	parseDashboardSpec,
	removeSpecTile,
	startFromPreset,
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

// The widgets of both demos. Each one is ordinary app code. It reads
// the scope through a hook and hands rows to a widget; no widget knows that a
// dashboard holds it. A chart that
// selects also gets its own selection back, so the selected marks stay lit.

// A tap on a touch screen shows the readout first, so a second tap selects.
// The hint names the gesture of the pointer that the device has.
function FilterHint({ mark }: { mark: 'bar' | 'slice' }) {
	return (
		<>
			<span className="pointer-coarse:hidden">Click</span>
			<span className="hidden pointer-coarse:inline">Double-tap</span> a {mark} to filter the other
			tiles
		</>
	)
}

/** The field that the bars of a revenue chart group by. */
type RevenueBarsProps = { by: 'region' | 'product' }

function RevenueBars({ by }: RevenueBarsProps) {
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

const layout: DashboardLayoutItem[] = [
	{ id: 'units-trend', x: 0, y: 0, w: 8, h: 20 },
	{ id: 'revenue-trend', x: 8, y: 0, w: 8, h: 20 },
	{ id: 'units', x: 16, y: 0, w: 8, h: 20 },
	{ id: 'regions', x: 0, y: 20, w: 12 },
	{ id: 'mix', x: 12, y: 20, w: 12 },
	{ id: 'trend', x: 0, y: 47, w: 24, h: 40 },
	{ id: 'orders', x: 0, y: 87, w: 24, h: 44 },
]

// The query starts with one rule, so the tiles show a filtered board at once.
const startFilter: QueryGroup = {
	id: 'filter',
	type: 'group',
	children: [{ id: 'revenue', type: 'rule', field: 'revenue', operator: 'gte', value: '200' }],
}

/** The options of a KPI tile: the measure that it leads with. */
type KpiOptions = { value: 'revenue' | 'units' }

// The registry gives each widget a name that a spec can save. It is a module
// constant, so it keeps its identity, and a commit renders no spec tile again.
// Each kind also sets how its tile sizes: a KPI demands 200 px, so a phone
// stacks it at full width, and a grid demands the width of its columns.
const widgets: Readonly<Record<string, DashboardWidget>> = {
	kpi: {
		render: (tile) => <Kpi {...(tile.options as KpiOptions)} />,
		minWidth: 200,
		defaultSize: { w: 8, h: 20 },
		minSize: { h: 16 },
	},
	units: {
		render: () => <Units />,
		minWidth: 200,
		defaultSize: { w: 8, h: 20 },
		minSize: { h: 16 },
	},
	bars: {
		render: (tile) => <RevenueBars {...(tile.options as RevenueBarsProps)} />,
		ratio: 16 / 9,
		defaultSize: { w: 12 },
	},
	mix: { render: () => <ProductMix />, ratio: 16 / 9, defaultSize: { w: 12 } },
	trend: { render: () => <Trend />, defaultSize: { w: 24, h: 36 }, minSize: { h: 20 } },
	orders: {
		render: () => <Orders />,
		minWidth: 480,
		defaultSize: { w: 24, h: 44 },
		minSize: { w: 12, h: 24 },
	},
}

/** One entry of the "Add tile" menu: a new tile, and a line that says what it shows. */
type Addition = { tile: Omit<DashboardSpecTile, 'id'>; hint: string }

const additions: Addition[] = [
	{
		tile: { widget: 'kpi', title: 'Monthly revenue', options: { value: 'revenue' } },
		hint: 'Latest month and its change',
	},
	{
		tile: { widget: 'kpi', title: 'Monthly units', options: { value: 'units' } },
		hint: 'Latest month and its change',
	},
	{ tile: { widget: 'units', title: 'Units sold' }, hint: 'Total, with a bar per month' },
	{
		tile: { widget: 'bars', title: 'Revenue by region', options: { by: 'region' } },
		hint: 'Bar chart, select a bar to filter',
	},
	{
		tile: { widget: 'bars', title: 'Revenue by product', options: { by: 'product' } },
		hint: 'Bar chart, select a bar to filter',
	},
	{ tile: { widget: 'mix', title: 'Product mix' }, hint: 'Donut chart, select a slice to filter' },
	{ tile: { widget: 'trend', title: 'Revenue by month' }, hint: 'Line chart' },
	{ tile: { widget: 'orders', title: 'Orders' }, hint: 'Each sale in a grid' },
]

// The templates that the app offers as a start point. A spec holds names and
// options only, so a template is plain data.
const presets: DashboardPreset[] = [
	{
		id: 'sales',
		label: 'Sales overview',
		description: 'KPIs, revenue, and the product mix',
		spec: {
			tiles: [
				{ id: 'tile-1', widget: 'kpi', title: 'Monthly revenue', options: { value: 'revenue' } },
				{ id: 'tile-2', widget: 'kpi', title: 'Monthly units', options: { value: 'units' } },
				{ id: 'tile-3', widget: 'units', title: 'Units sold' },
				{ id: 'tile-4', widget: 'bars', title: 'Revenue by region', options: { by: 'region' } },
				{ id: 'tile-5', widget: 'mix', title: 'Product mix' },
			],
			layout: [
				{ id: 'tile-1', x: 0, y: 0, w: 8, h: 20 },
				{ id: 'tile-2', x: 8, y: 0, w: 8, h: 20 },
				{ id: 'tile-3', x: 16, y: 0, w: 8, h: 20 },
				{ id: 'tile-4', x: 0, y: 20, w: 12 },
				{ id: 'tile-5', x: 12, y: 20, w: 12 },
			],
		},
	},
	{
		id: 'operations',
		label: 'Operations',
		description: 'Units, products, and each order',
		spec: {
			tiles: [
				{ id: 'tile-1', widget: 'units', title: 'Units sold' },
				{ id: 'tile-2', widget: 'bars', title: 'Revenue by product', options: { by: 'product' } },
				{ id: 'tile-3', widget: 'orders', title: 'Orders' },
			],
			layout: [
				{ id: 'tile-1', x: 0, y: 0, w: 12, h: 27 },
				{ id: 'tile-2', x: 12, y: 0, w: 12 },
				{ id: 'tile-3', x: 0, y: 27, w: 24, h: 44 },
			],
		},
	},
	{ id: 'blank', label: 'Blank', description: 'No tiles', spec: { tiles: [], layout: [] } },
]

const [initial] = presets as [DashboardPreset]

/** The key of the saved board in the storage of the browser. */
const storageKey = 'midgard-docs:dashboard-board'

/** The board as it saves: the template that it started from, and its spec. */
type Board = { template: string; spec: DashboardSpec }

const fresh = (preset: DashboardPreset): Board => ({
	template: preset.id,
	spec: startFromPreset(preset).spec,
})

// A board read from storage passes through the parse, which repairs a stale or
// damaged spec. A storage that throws or holds no board gives the first template.
function load(): Board {
	try {
		const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<Board> | null

		if (saved?.spec === undefined) return fresh(initial)

		const template = presets.some((preset) => preset.id === saved.template)
			? (saved.template as string)
			: initial.id

		return { template, spec: parseDashboardSpec(saved.spec).spec }
	} catch {
		return fresh(initial)
	}
}

function save(board: Board | null) {
	try {
		if (board === null) localStorage.removeItem(storageKey)
		else localStorage.setItem(storageKey, JSON.stringify(board))
	} catch {
		// A storage that refuses a write leaves the board on screen only.
	}
}

const labelOf = (id: string) => presets.find((preset) => preset.id === id)?.label ?? id

function RegistryExample() {
	const [board, setBoard] = useState(load)

	const { spec } = board

	const [editing, setEditing] = useState(false)

	// A narrow board paints the re-pack, where edit mode stands down. The control
	// that starts it then hides, and a live edit ends.
	const [projected, setProjected] = useState(false)

	const project = useCallback((next: boolean) => {
		setProjected(next)

		if (next) setEditing(false)
	}, [])

	const pristine = useMemo(() => JSON.stringify(board) === JSON.stringify(fresh(initial)), [board])

	// Each change saves, so the board comes back after a reload. The first
	// template saves nothing, and a reset clears the saved board.
	useEffect(() => save(pristine ? null : board), [board, pristine])

	const restart = (next: Board) => {
		setBoard(next)

		setEditing(false)

		// A new template mounts a new board, which reports its own projection.
		if (next.template !== board.template) setProjected(false)
	}

	const choose = (id: string | null) => {
		const preset = presets.find((candidate) => candidate.id === id)

		if (preset) restart(fresh(preset))
	}

	const setSpec = useCallback(
		(update: (current: DashboardSpec) => DashboardSpec) =>
			setBoard((current) => ({ ...current, spec: update(current.spec) })),
		[],
	)

	// A remove leaves a gap, because the board never packs itself. Tidy closes the
	// gaps in one explicit move.
	const handle = useRef<DashboardHandle>(null)

	const add = (tile: Omit<DashboardSpecTile, 'id'>) =>
		setSpec((current) => addSpecTile(current, { ...tile, id: nextSpecTileId(current) }))

	// The tiles draw the edit controls, and the spec operations keep the tiles and
	// the layout in step: a remove drops the layout entry too, and a copy takes the
	// span of its source.
	const remove = useCallback(
		(tile: DashboardSpecTile) => setSpec((current) => removeSpecTile(current, tile.id)),
		[setSpec],
	)

	const duplicate = useCallback(
		(tile: DashboardSpecTile) => setSpec((current) => duplicateSpecTile(current, tile.id)),
		[setSpec],
	)

	// The spec as it saves: a round trip through JSON changes nothing.
	const json = useMemo<JsonValue>(() => JSON.parse(JSON.stringify(spec)), [spec])

	return (
		<Example title="Build and save">
			<Flex gap="sm" align="center" wrap>
				<div className="w-full sm:w-56">
					<Select
						aria-label="Template"
						value={board.template}
						onValueChange={choose}
						displayValue={labelOf}
					>
						{presets.map((preset) => (
							<SelectOption key={preset.id} value={preset.id}>
								<SelectLabel>{preset.label}</SelectLabel>

								<SelectDescription>{preset.description}</SelectDescription>
							</SelectOption>
						))}
					</Select>
				</div>

				<Menu placement="bottom-start">
					<MenuTrigger>
						<Button
							variant="outline"
							prefix={<Icon icon={<Plus />} />}
							suffix={<Icon icon={<ChevronDown />} />}
						>
							Add tile
						</Button>
					</MenuTrigger>

					<MenuContent>
						{additions.map(({ tile, hint }) => (
							<MenuItem key={tile.title} onAction={() => add(tile)}>
								<MenuLabel>{tile.title}</MenuLabel>

								<MenuDescription>{hint}</MenuDescription>
							</MenuItem>
						))}
					</MenuContent>
				</Menu>

				<Spacer />

				<Button
					color="red"
					variant="soft"
					disabled={pristine}
					onClick={() => restart(fresh(initial))}
				>
					Reset
				</Button>

				{editing && (
					<Button variant="outline" onClick={() => handle.current?.tidy()}>
						Tidy
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

			<Text tone="muted">
				Start from a template, add tiles, and edit the layout. The board saves in this browser, so
				your changes stay after a reload.
			</Text>

			<DashboardWidgetProvider widgets={widgets}>
				{/* The template keys the board, so a new one mounts each tile again. */}
				<Dashboard
					key={board.template}
					ref={handle}
					aria-label="Custom dashboard"
					editing={editing}
					onProjectedChange={project}
					layout={{
						value: spec.layout,
						onValueChange: (layout) => setSpec((current) => ({ ...current, layout })),
					}}
				>
					<DashboardTiles tiles={spec.tiles} onRemove={remove} onDuplicate={duplicate} expandable />
				</Dashboard>
			</DashboardWidgetProvider>

			{spec.tiles.length === 0 && (
				<Text tone="muted" className="text-center">
					This board has no tiles. Use “Add tile” to put one on it.
				</Text>
			)}

			<Stack gap="sm">
				<Text tone="muted">
					Saved as plain JSON: each tile names its widget, and the registry draws it.
				</Text>

				<JsonTree data={json} rootKey="spec" defaultExpandDepth={0} />
			</Stack>
		</Example>
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

	const [filter, setFilter] = useState<QueryGroup>(startFilter)

	const [selection, setSelection] = useState<DashboardSelection[]>([])

	return (
		<Stack gap="lg">
			<Example title="Query">
				<Stack gap="md">
					<Text tone="muted">
						Each tile reads its rows through the scope of the board. A rule in the query filters
						every tile, and a selected bar or slice filters the other tiles.
					</Text>

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
							<RevenueBars by="region" />
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
