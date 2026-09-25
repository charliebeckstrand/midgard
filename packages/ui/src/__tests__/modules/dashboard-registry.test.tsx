import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardSpecTile,
	DashboardTile,
	DashboardTiles,
	type DashboardWidget,
	DashboardWidgetProvider,
	type DashboardWidgetRenderer,
	useDashboardScope,
} from '../../modules/dashboard'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

beforeEach(() => {
	// jsdom lays nothing out, so each element reports a 1200 px width: a 50 px pitch.
	Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 1200 })
})

afterEach(() => {
	if (originalClientWidth)
		Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth)
})

/** A widget whose component reads the scope, as app code does. */
function Metric({ label }: { label: string }) {
	const scope = useDashboardScope()

	return <p>{`${label} ${scope.active ? 'filtered' : 'whole'}`}</p>
}

const WIDGETS: Readonly<Record<string, DashboardWidget>> = {
	metric: {
		render: (tile) => <Metric label={(tile.options as { label: string }).label} />,
		ratio: 16 / 9,
	},
	stat: {
		render: () => <p>Stat</p>,
		minWidth: 160,
		defaultSize: { w: 6, h: 16 },
	},
}

const TILES: DashboardSpecTile[] = [
	{
		id: 'revenue',
		widget: 'metric',
		title: 'Revenue',
		description: 'This year',
		options: { label: 'Revenue' },
	},
	{ id: 'units', widget: 'stat', title: 'Units' },
]

const LAYOUT: DashboardLayoutItem[] = [
	{ id: 'revenue', x: 0, y: 0, w: 12 },
	{ id: 'units', x: 12, y: 0, w: 6, h: 16 },
]

function Board({ tiles = TILES }: { tiles?: DashboardSpecTile[] }) {
	return (
		<DashboardWidgetProvider widgets={WIDGETS}>
			<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
				<DashboardTiles tiles={tiles} />
			</Dashboard>
		</DashboardWidgetProvider>
	)
}

describe('DashboardTiles', () => {
	it('renders each spec tile through its kind, with its title, description, and options', () => {
		renderUI(<Board />)

		const revenue = screen.getByRole('group', { name: 'Revenue' })

		expect(revenue).toHaveTextContent('This year')

		expect(revenue).toHaveTextContent('Revenue whole')

		expect(screen.getByRole('group', { name: 'Units' })).toHaveTextContent('Stat')
	})

	it('renders each spec tile with a layout entry on the server, at its saved cell', () => {
		const html = renderToString(<Board />)

		// The kind gives the ratio, so the height derives from the width: 4 × 12 / (16 / 9).
		expect(html).toContain('grid-area:1 / 1 / span 27 / span 12')

		expect(html).toContain('grid-area:1 / 13 / span 16 / span 6')

		expect(html).toContain('Revenue whole')
	})

	it('gives a new tile the default size of its kind', () => {
		const { container } = renderUI(
			<Board tiles={[...TILES, { id: 'added', widget: 'stat', title: 'Added' }]} />,
		)

		const tiles = allBySlot(container, 'dashboard-tile')

		// The new tile takes a new row under the lowest tile, at 6 × 16.
		expect(tiles[2]?.style.gridArea).toBe('28 / 1 / span 16 / span 6')
	})

	it('gives a new tile its own default size before the default size of its kind', () => {
		const { container } = renderUI(
			<Board
				tiles={[
					...TILES,
					{ id: 'added', widget: 'stat', title: 'Added', defaultSize: { w: 10, h: 12 } },
				]}
			/>,
		)

		expect(allBySlot(container, 'dashboard-tile')[2]?.style.gridArea).toBe(
			'28 / 1 / span 12 / span 10',
		)
	})

	it('places the actions in the header of each tile', () => {
		const actions = (tile: DashboardSpecTile) => (
			<button type="button">{`Remove ${tile.title}`}</button>
		)

		renderUI(
			<DashboardWidgetProvider widgets={WIDGETS}>
				<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
					<DashboardTiles tiles={TILES} actions={actions} />
				</Dashboard>
			</DashboardWidgetProvider>,
		)

		expect(screen.getByRole('button', { name: 'Remove Revenue' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Remove Units' })).toBeInTheDocument()
	})

	it('shares one board with JSX tiles', () => {
		renderUI(
			<DashboardWidgetProvider widgets={WIDGETS}>
				<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
					<DashboardTiles tiles={TILES} />

					<DashboardTile id="notes" title="Notes">
						<p>Hand-written</p>
					</DashboardTile>
				</Dashboard>
			</DashboardWidgetProvider>,
		)

		expect(screen.getAllByRole('group')).toHaveLength(3)
	})

	it('confines a renderer that throws to its own tile, and reports it', () => {
		const onTileError = vi.fn()

		vi.spyOn(console, 'error').mockImplementation(() => {})

		renderUI(
			<DashboardWidgetProvider widgets={WIDGETS}>
				<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }} onTileError={onTileError}>
					{/* A saved tile with no options: the metric renderer reads `label` and throws. */}
					<DashboardTiles
						tiles={[{ id: 'revenue', widget: 'metric', title: 'Revenue' }, ...TILES.slice(1)]}
					/>

					<DashboardTile id="notes" title="Notes">
						<p>Hand-written</p>
					</DashboardTile>
				</Dashboard>
			</DashboardWidgetProvider>,
		)

		expect(screen.getByRole('alert')).toHaveTextContent('Revenue failed to render.')

		expect(screen.getByRole('group', { name: 'Units' })).toHaveTextContent('Stat')

		expect(screen.getByText('Hand-written')).toBeInTheDocument()

		expect(onTileError).toHaveBeenCalledWith('revenue', expect.any(TypeError))
	})

	it('renders the other tiles on the server when a renderer throws', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		const html = renderToString(
			<Board tiles={[{ id: 'revenue', widget: 'metric', title: 'Revenue' }, ...TILES.slice(1)]} />,
		)

		// The tile Suspense boundary hands the error to a client render. The dev
		// error text names components, so match the markup of the sibling tile.
		expect(html).toContain('<p>Stat</p>')
	})

	it('types a renderer that returns a promise as an error', () => {
		// @ts-expect-error The renderer runs again on each Suspense retry, so a promise never settles.
		const later: DashboardWidgetRenderer = async () => <p>Later</p>

		expect(later).toBeTypeOf('function')
	})

	it('does not render an unchanged spec tile again when the app commits a new layout', () => {
		const render = vi.fn((tile: DashboardSpecTile) => <p>{tile.id}</p>)

		const widgets = { plain: { render } }

		const tiles: DashboardSpecTile[] = [
			{ id: 'a', widget: 'plain', title: 'A' },
			{ id: 'b', widget: 'plain', title: 'B' },
		]

		const onValueChange = vi.fn()

		function App() {
			const [layout, setLayout] = useState<DashboardLayoutItem[]>([
				{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
				{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
			])

			return (
				<DashboardWidgetProvider widgets={widgets}>
					<Dashboard
						aria-label="Sales"
						editing
						layout={{
							value: layout,
							onValueChange: (next) => {
								onValueChange(next)

								setLayout(next)
							},
						}}
					>
						<DashboardTiles tiles={tiles} />
					</Dashboard>
				</DashboardWidgetProvider>
			)
		}

		renderUI(<App />)

		render.mockClear()

		const [east] = screen.getAllByRole('separator', { name: 'Resize B' })

		fireEvent.keyDown(east as HTMLElement, { key: 'ArrowRight' })

		// The app rendered again with the new layout, and no spec tile rendered.
		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(render).not.toHaveBeenCalled()
	})
})

describe('DashboardWidgetProvider', () => {
	it('states the gap for a kind that no widget claims, and keeps the tile', () => {
		const { container } = renderUI(
			<Board tiles={[...TILES, { id: 'forecast', widget: 'forecast', title: 'Forecast' }]} />,
		)

		expect(screen.getByRole('group', { name: 'Forecast' })).toHaveTextContent(
			'This dashboard cannot show a “forecast” tile.',
		)

		expect(bySlot(container, 'dashboard-tile-missing')).toBeInTheDocument()

		// The gap is not an error, so the tile boundary shows no alert.
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})

	it('demands no width for a kind that no widget claims, so edit mode stays live', () => {
		renderUI(
			<DashboardWidgetProvider widgets={WIDGETS}>
				<Dashboard
					aria-label="Sales"
					editing
					layout={{ defaultValue: [{ id: 'f', x: 0, y: 0, w: 2, h: 10 }] }}
				>
					<DashboardTiles tiles={[{ id: 'f', widget: 'forecast', title: 'Forecast' }]} />
				</Dashboard>
			</DashboardWidgetProvider>,
		)

		// At a 50 px pitch, the default 320 px floor needs 7 columns. The tile has 2.
		expect(screen.getByRole('button', { name: 'Move Forecast' })).toBeInTheDocument()
	})

	it('states the gap for a kind named after a member of the object prototype', () => {
		renderUI(
			<Board
				tiles={[
					{ id: 'x', widget: 'constructor', title: 'X' },
					{ id: 'y', widget: 'toString', title: 'Y' },
				]}
			/>,
		)

		expect(screen.getByRole('group', { name: 'X' })).toHaveTextContent('“constructor”')

		expect(screen.getByRole('group', { name: 'Y' })).toHaveTextContent('“toString”')
	})

	it('replaces the stated line with the provider fallback', () => {
		renderUI(
			<DashboardWidgetProvider
				widgets={WIDGETS}
				fallback={(tile) => <p>{`No ${tile.widget} here`}</p>}
			>
				<Dashboard aria-label="Sales">
					<DashboardTiles tiles={[{ id: 'f', widget: 'forecast', title: 'Forecast' }]} />
				</Dashboard>
			</DashboardWidgetProvider>,
		)

		expect(screen.getByText('No forecast here')).toBeInTheDocument()
	})

	it('merges nested providers: the inner kind wins, and the outer kinds and fallback stay', () => {
		const inner = { stat: { render: () => <p>Inner stat</p> } }

		renderUI(
			<DashboardWidgetProvider widgets={WIDGETS} fallback={() => <p>Outer fallback</p>}>
				<DashboardWidgetProvider widgets={inner}>
					<Dashboard aria-label="Sales">
						<DashboardTiles
							tiles={[
								{ id: 's', widget: 'stat', title: 'S' },
								{ id: 'm', widget: 'metric', title: 'M', options: { label: 'Outer' } },
								{ id: 'u', widget: 'unknown', title: 'U' },
							]}
						/>
					</Dashboard>
				</DashboardWidgetProvider>
			</DashboardWidgetProvider>,
		)

		expect(screen.getByRole('group', { name: 'S' })).toHaveTextContent('Inner stat')

		expect(screen.getByRole('group', { name: 'M' })).toHaveTextContent('Outer whole')

		expect(screen.getByRole('group', { name: 'U' })).toHaveTextContent('Outer fallback')
	})

	it('applies its mount policy to each spec tile', () => {
		const observer = window.IntersectionObserver

		// A server has no observer, so a held tile renders its fallback there.
		Reflect.deleteProperty(window, 'IntersectionObserver')

		try {
			const html = renderToString(
				<DashboardWidgetProvider widgets={WIDGETS} mount="lazy">
					<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
						<DashboardTiles tiles={TILES} />
					</Dashboard>
				</DashboardWidgetProvider>,
			)

			expect(html).toContain('data-deferred')

			expect(html).not.toContain('Revenue whole')
		} finally {
			window.IntersectionObserver = observer
		}
	})
})
