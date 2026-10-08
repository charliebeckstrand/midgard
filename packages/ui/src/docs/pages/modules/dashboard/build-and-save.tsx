import { ChevronDown, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert } from 'ui/alert'
import { Box } from 'ui/box'
import { Button } from 'ui/button'
import {
	addSpecTile,
	Dashboard,
	type DashboardHandle,
	type DashboardPreset,
	type DashboardSpec,
	type DashboardSpecTile,
	DashboardTiles,
	type DashboardWidget,
	DashboardWidgetProvider,
	duplicateSpecTile,
	nextSpecTileId,
	parseDashboardSpec,
	removeSpecTile,
	startFromPreset,
} from 'ui/dashboard'
import { Divider } from 'ui/divider'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { JsonTree, type JsonValue } from 'ui/json-tree'
import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuItem,
	MenuLabel,
	MenuText,
	MenuTrigger,
} from 'ui/menu'
import { Select, SelectDescription, SelectLabel, SelectOption, SelectText } from 'ui/select'
import { Spacer } from 'ui/spacer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'
import { ResetButton } from '../../../kit/reset-button.tsx'
import {
	Kpi,
	type KpiProps,
	Orders,
	ProductMix,
	RevenueBars,
	type RevenueBarsProps,
	Trend,
	Units,
} from './widgets.tsx'

// The registry gives each widget a name that a spec can save. It is a module
// constant, so a commit renders no spec tile again. Each kind also sets how its
// tile sizes: a KPI needs 200 px, and a grid needs the width of its columns.
const widgets: Readonly<Record<string, DashboardWidget>> = {
	kpi: {
		render: (tile) => <Kpi {...(tile.options as KpiProps)} />,
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

type Addition = { tile: Omit<DashboardSpecTile, 'id'>; hint: string }

const additions: Addition[] = [
	{
		tile: { widget: 'kpi', title: 'Monthly revenue', options: { value: 'revenue' } },
		hint: 'This month, with its change and trend',
	},
	{
		tile: { widget: 'kpi', title: 'Monthly units', options: { value: 'units' } },
		hint: 'This month, with its change and trend',
	},
	{ tile: { widget: 'units', title: 'Units sold' }, hint: 'The half-year total, month by month' },
	{
		tile: { widget: 'bars', title: 'Revenue by region', options: { by: 'region' } },
		hint: 'Select a region to filter the board',
	},
	{
		tile: { widget: 'bars', title: 'Revenue by product', options: { by: 'product' } },
		hint: 'Select a product to filter the board',
	},
	{ tile: { widget: 'mix', title: 'Product mix' }, hint: 'The share of revenue of each product' },
	{ tile: { widget: 'trend', title: 'Revenue by month' }, hint: 'Six months of revenue as a line' },
	{ tile: { widget: 'orders', title: 'Orders' }, hint: 'Each sale, ten rows to a page' },
]

const presets: DashboardPreset[] = [
	{
		id: 'sales',
		label: 'Sales overview',
		description: 'Headline numbers, regions, and the product mix',
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
		description: 'Volume, product revenue, and each order',
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
	{
		id: 'blank',
		label: 'Blank',
		description: 'An empty board to build on',
		spec: { tiles: [], layout: [] },
	},
]

const [initial] = presets as [DashboardPreset]

const storageKey = 'midgard-docs:dashboard-board'

type Board = { template: string; spec: DashboardSpec }

const fresh = (preset: DashboardPreset): Board => ({
	template: preset.id,
	spec: startFromPreset(preset).spec,
})

// The parse repairs a saved spec that is old or damaged. A storage that
// throws or holds no board gives the first template.
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
		// A storage that refuses a write keeps the board on the screen only.
	}
}

const labelOf = (id: string) => presets.find((preset) => preset.id === id)?.label ?? id

export default function BuildAndSave() {
	// The server has no storage, so the first render shows the first template.
	// The saved board loads after hydration.
	const [board, setBoard] = useState(() => fresh(initial))

	const [loaded, setLoaded] = useState(false)

	const { spec } = board

	const [editing, setEditing] = useState(false)

	// A narrow board shows a re-pack, and edit mode stops there. The edit control then hides.
	const [projected, setProjected] = useState(false)

	const project = useCallback((next: boolean) => {
		setProjected(next)

		if (next) setEditing(false)
	}, [])

	const pristine = useMemo(() => JSON.stringify(board) === JSON.stringify(fresh(initial)), [board])

	const restart = (next: Board) => {
		setBoard(next)

		setEditing(false)

		// A new template mounts a new board, which reports its own projection.
		if (next.template !== board.template) setProjected(false)
	}

	useEffect(() => {
		const saved = load()

		setBoard(saved)

		if (saved.template !== initial.id) setProjected(false)

		setLoaded(true)
	}, [])

	// Each change saves, so the board comes back after a reload. The first
	// template saves nothing, and a reset clears the saved board.
	useEffect(() => {
		if (loaded) save(pristine ? null : board)
	}, [board, pristine, loaded])

	const choose = (id: string | null) => {
		const preset = presets.find((candidate) => candidate.id === id)

		if (preset) restart(fresh(preset))
	}

	const setSpec = useCallback(
		(update: (current: DashboardSpec) => DashboardSpec) =>
			setBoard((current) => ({ ...current, spec: update(current.spec) })),
		[],
	)

	// A remove leaves a gap, because the board never packs itself. Tidy closes the gaps.
	const handle = useRef<DashboardHandle>(null)

	const add = (tile: Omit<DashboardSpecTile, 'id'>) =>
		setSpec((current) => addSpecTile(current, { ...tile, id: nextSpecTileId(current) }))

	const remove = useCallback(
		(tile: DashboardSpecTile) => setSpec((current) => removeSpecTile(current, tile.id)),
		[setSpec],
	)

	const duplicate = useCallback(
		(tile: DashboardSpecTile) => setSpec((current) => duplicateSpecTile(current, tile.id)),
		[setSpec],
	)

	const empty = spec.tiles.length === 0

	const json = useMemo<JsonValue>(() => JSON.parse(JSON.stringify(spec)), [spec])

	return (
		<Stack gap="md">
			<Flex
				direction={{ initial: 'col', sm: 'row' }}
				gap={{ initial: 'lg', sm: 'sm' }}
				align={{ initial: 'stretch', sm: 'center' }}
			>
				<div className="sm:w-56">
					<Select
						aria-label="Template"
						value={board.template}
						onValueChange={choose}
						displayValue={labelOf}
					>
						{presets.map((preset) => (
							<SelectOption key={preset.id} value={preset.id}>
								<SelectText>
									<SelectLabel>{preset.label}</SelectLabel>
									<SelectDescription>{preset.description}</SelectDescription>
								</SelectText>
							</SelectOption>
						))}
					</Select>
				</div>
				<Flex gap="sm" align="center" flex="1">
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
									<MenuText>
										<MenuLabel>{tile.title}</MenuLabel>
										<MenuDescription>{hint}</MenuDescription>
									</MenuText>
								</MenuItem>
							))}
						</MenuContent>
					</Menu>
					<Spacer />
					{!pristine && <ResetButton onClick={() => restart(fresh(initial))} />}
					{editing && !empty && (
						<Button variant="outline" onClick={() => handle.current?.tidy()}>
							Tidy
						</Button>
					)}
					{!empty && (
						<Button
							color={editing ? 'zinc' : 'blue'}
							hidden={projected}
							onClick={() => setEditing((live) => !live)}
						>
							{editing ? 'Done' : 'Edit layout'}
						</Button>
					)}
				</Flex>
			</Flex>
			<Alert
				severity="info"
				closable
				className="w-full"
				description={
					<PointerHint
						mouse="Pick a template, then add tiles, drag them into place, and resize them. The board remembers your layout, even after a reload."
						touch="Pick a template, then add tiles, drag them into place by their grips, and resize them by their edges. The board remembers your layout, even after a reload."
					/>
				}
			/>
			<DashboardWidgetProvider widgets={widgets}>
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
			{empty && (
				<Box className="flex items-center justify-center rounded-lg border border-zinc-300 border-dashed p-12 dark:border-zinc-700">
					<Text tone="muted" className="text-center">
						Nothing here yet. Add a tile to begin.
					</Text>
				</Box>
			)}
			<Divider />
			<Stack gap="sm">
				<Text tone="muted">
					Saved as plain JSON: each tile names its widget, and the registry draws it.
				</Text>
				<JsonTree data={json} rootKey="spec" defaultExpandDepth={0} />
			</Stack>
		</Stack>
	)
}
