import { act } from '@testing-library/react'
import { Profiler, type ReactNode, StrictMode, use, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardProps,
	DashboardTile,
	useDashboardRows,
	useDashboardScope,
} from '../../modules/dashboard'
import { k } from '../../recipes/kata/dashboard'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

const LAYOUT: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 0, w: 12 },
	{ id: 'b', x: 12, y: 0, w: 12 },
	{ id: 'c', x: 0, y: 27, w: 8, h: 20 },
]

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

beforeEach(() => {
	// jsdom lays nothing out, so each element reports a 1200 px width: a 50 px pitch.
	Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 1200 })
})

afterEach(() => {
	if (originalClientWidth)
		Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth)
})

function Board({
	editing = false,
	layout = { defaultValue: LAYOUT },
	onDragEnd,
	children,
}: {
	editing?: boolean
	layout?: DashboardProps['layout']
	onDragEnd?: DashboardProps['onDragEnd']
	children?: ReactNode
}) {
	return (
		<Dashboard aria-label="Sales" editing={editing} layout={layout} onDragEnd={onDragEnd}>
			<DashboardTile id="a" title="Revenue" ratio={16 / 9}>
				<button type="button">Inside a</button>
			</DashboardTile>

			<DashboardTile id="b" title="Traffic" ratio={16 / 9}>
				<div data-testid="content-b" />
			</DashboardTile>

			<DashboardTile id="c">
				<div data-testid="content-c" />
			</DashboardTile>

			{children}
		</Dashboard>
	)
}

describe('Dashboard', () => {
	it('renders each tile with a layout entry on the server, at its saved cell', () => {
		const html = renderToString(<Board />)

		expect(html).toContain('grid-area:1 / 1 / span 27 / span 12')

		expect(html).toContain('grid-area:1 / 13 / span 27 / span 12')

		expect(html).toContain('grid-area:28 / 1 / span 20 / span 8')
	})

	it('derives the row unit from the container, with no measurement', () => {
		const { container } = renderUI(<Board />)

		const canvas = bySlot(container, 'dashboard-canvas')

		// The CSS engine folds the division, so read the unit, not the exact string.
		expect(canvas?.style.gridAutoRows).toContain('cqi')

		expect(bySlot(container, 'dashboard')?.tagName).toBe('SECTION')
	})

	it('names each titled tile, and draws no grip at rest', () => {
		renderUI(<Board />)

		expect(screen.getByRole('group', { name: 'Revenue' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Move Revenue' })).not.toBeInTheDocument()
	})

	it('fades the spark veil at rest only where the pointer can hover', () => {
		const { rerender } = renderUI(<Board />)

		const card = screen.getByRole('group', { name: 'Revenue' })

		const fades = () => [...card.classList].filter((name) => name.includes(':not-hover:'))

		// jsdom applies no Tailwind CSS, so the class carries the pin. Where the
		// primary pointer cannot hover, the veil must stay in view.
		expect(fades()).toHaveLength(2)

		for (const name of fades()) expect(name.startsWith('[@media(hover:hover)]:')).toBe(true)

		rerender(<Board editing />)

		expect(fades()).toEqual([])
	})

	it('makes the content inert in edit mode, and keeps it live at rest', () => {
		const { container, rerender } = renderUI(<Board />)

		const [content] = allBySlot(container, 'dashboard-tile-content')

		expect(content).not.toHaveAttribute('inert')

		rerender(<Board editing />)

		expect(content).toHaveAttribute('inert')

		expect(screen.getByRole('button', { name: 'Move Revenue' })).toBeInTheDocument()

		// Each tile gets a grip; the tile with no header gets it on its corner.
		expect(allBySlot(container, 'dashboard-handle')).toHaveLength(3)
	})

	it('gives each edge a keyboard splitter, and no south edge to a ratio tile', () => {
		renderUI(<Board editing />)

		expect(screen.getByRole('separator', { name: 'Resize Revenue' })).toHaveAttribute(
			'aria-orientation',
			'vertical',
		)

		expect(screen.getAllByRole('separator', { name: 'Resize c' })).toHaveLength(2)
	})

	it('commits a keyboard resize, and emits a ratio tile without h', () => {
		const onValueChange = vi.fn()

		function Controlled() {
			const [value, setValue] = useState(LAYOUT)

			return (
				<Board
					editing
					layout={{
						value,
						onValueChange: (next) => {
							onValueChange(next)

							setValue(next)
						},
					}}
				/>
			)
		}

		renderUI(<Controlled />)

		const [east] = screen.getAllByRole('separator', { name: 'Resize c' })

		fireEvent.keyDown(east as HTMLElement, { key: 'ArrowRight' })

		expect(onValueChange).toHaveBeenCalledTimes(1)

		const next = onValueChange.mock.calls[0]?.[0] as DashboardLayoutItem[]

		expect(next.find((item) => item.id === 'c')).toEqual({ id: 'c', x: 0, y: 27, w: 9, h: 20 })

		expect(next.find((item) => item.id === 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 12 })
	})

	it('marks the grip and the card as held while a tile drags, so the grab hand closes', async () => {
		const { container } = renderUI(<Board editing />)

		const grip = screen.getByRole('button', { name: 'Move Revenue' })

		const card = grip.closest('[data-slot="card"]')

		expect(grip).not.toHaveAttribute('data-dragging')

		grip.focus()

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		expect(grip).toHaveAttribute('data-dragging')

		expect(card).toHaveAttribute('data-dragging')

		// The keyboard sensor attaches its keys on a timer after the lift.
		await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

		fireEvent.keyDown(grip, { code: 'Escape', key: 'Escape' })

		expect(grip).not.toHaveAttribute('data-dragging')

		expect(bySlot(container, 'dashboard-placeholder')).toBeNull()
	})

	it('renders only the tile whose cell changed', () => {
		const renders = new Map<string, number>()

		const count = (id: string) => () => renders.set(id, (renders.get(id) ?? 0) + 1)

		renderUI(
			<Dashboard aria-label="Sales" editing layout={{ defaultValue: LAYOUT }}>
				<Profiler id="a" onRender={count('a')}>
					<DashboardTile id="a" title="Revenue" ratio={16 / 9} />
				</Profiler>

				<Profiler id="c" onRender={count('c')}>
					<DashboardTile id="c" title="Orders" />
				</Profiler>
			</Dashboard>,
		)

		renders.clear()

		fireEvent.keyDown(
			screen.getAllByRole('separator', { name: 'Resize Orders' })[0] as HTMLElement,
			{
				key: 'ArrowRight',
			},
		)

		expect(renders.get('c')).toBeGreaterThan(0)

		expect(renders.get('a')).toBeUndefined()
	})

	it('renders no card of a tile that a lift, a cancel, or a drop does not move', async () => {
		const onValueChange = vi.fn()

		renderUI(<Board editing layout={{ defaultValue: LAYOUT, onValueChange }} />)

		const grip = screen.getByRole('button', { name: 'Move Revenue' })

		grip.focus()

		// Each render of a card calls the card recipe once, with the drag flag of its tile.
		const cards = vi.spyOn(k, 'card')

		const flags = () => cards.mock.calls.map(([variants]) => variants?.dragging)

		// The keyboard sensor attaches its keys on a timer after the lift.
		const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

		// A lift changes the dnd-kit context, which each tile reads.
		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		expect(flags()).toEqual([true])

		await settle()

		cards.mockClear()

		// Escape cancels the drag.
		fireEvent.keyDown(grip, { code: 'Escape', key: 'Escape' })

		expect(flags()).toEqual([false])

		// Space drops the drag, and the drop commits a reorder with Traffic.
		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		await settle()

		// Twelve columns to the right, Revenue covers the cell of Traffic.
		for (let step = 0; step < 12; step++) {
			fireEvent.keyDown(grip, { code: 'ArrowRight', key: 'ArrowRight' })
		}

		cards.mockClear()

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		await settle()

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(flags()).toEqual([false])
	})

	it('confines an error to its tile, reports it, and retries', () => {
		const onTileError = vi.fn()

		let fail = true

		function Flaky() {
			if (fail) throw new Error('boom')

			return <p>Recovered</p>
		}

		vi.spyOn(console, 'error').mockImplementation(() => {})

		renderUI(
			<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }} onTileError={onTileError}>
				<DashboardTile id="a" title="Revenue">
					<Flaky />
				</DashboardTile>

				<DashboardTile id="b" title="Traffic">
					<p>Fine</p>
				</DashboardTile>
			</Dashboard>,
		)

		expect(screen.getByRole('alert')).toHaveTextContent('Revenue failed to render.')

		expect(screen.getByText('Fine')).toBeInTheDocument()

		expect(onTileError).toHaveBeenCalledWith('a', expect.any(Error))

		fail = false

		fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

		expect(screen.getByText('Recovered')).toBeInTheDocument()
	})

	it('confines an error in the actions to the header controls, and reports it', () => {
		const onTileError = vi.fn()

		function Broken(): ReactNode {
			throw new Error('boom')
		}

		vi.spyOn(console, 'error').mockImplementation(() => {})

		renderUI(
			<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }} onTileError={onTileError}>
				<DashboardTile id="a" title="Revenue" actions={<Broken />}>
					<p>Chart</p>
				</DashboardTile>

				<DashboardTile id="b" title="Traffic" actions={<button type="button">Menu</button>}>
					<p>Fine</p>
				</DashboardTile>
			</Dashboard>,
		)

		// The controls go away with no error state, and the rest of the tile stays.
		const revenue = screen.getByRole('group', { name: 'Revenue' })

		expect(revenue).toHaveTextContent('Chart')

		expect(bySlot(revenue, 'dashboard-tile-actions')).toBeEmptyDOMElement()

		expect(screen.queryByRole('alert')).toBeNull()

		expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()

		expect(onTileError).toHaveBeenCalledWith('a', expect.any(Error))
	})

	it('confines an error in the description to the header, and reports it', () => {
		const onTileError = vi.fn()

		function Broken(): ReactNode {
			throw new Error('boom')
		}

		vi.spyOn(console, 'error').mockImplementation(() => {})

		renderUI(
			<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }} onTileError={onTileError}>
				<DashboardTile id="a" title="Revenue" description={<Broken />}>
					<p>Chart</p>
				</DashboardTile>

				<DashboardTile id="b" title="Traffic" description="This year">
					<p>Fine</p>
				</DashboardTile>
			</Dashboard>,
		)

		// The description goes away with its element, and the title and the widget stay.
		const revenue = screen.getByRole('group', { name: 'Revenue' })

		expect(revenue).toHaveTextContent('Chart')

		expect(bySlot(revenue, 'card-description')).toBeNull()

		expect(screen.queryByRole('alert')).toBeNull()

		expect(screen.getByRole('group', { name: 'Traffic' })).toHaveTextContent('This year')

		expect(onTileError).toHaveBeenCalledWith('a', expect.any(Error))
	})

	it('renders the board on the server when a description throws', () => {
		function Broken(): ReactNode {
			throw new Error('boom')
		}

		vi.spyOn(console, 'error').mockImplementation(() => {})

		const html = renderToString(
			<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
				<DashboardTile id="a" title="Revenue" description={<Broken />}>
					<p>Chart</p>
				</DashboardTile>

				<DashboardTile id="b" title="Traffic">
					<p>Fine</p>
				</DashboardTile>
			</Dashboard>,
		)

		// The Suspense boundary of the guard hands the error to a client render. The dev
		// error text names components, so match the markup of each widget.
		expect(html).toContain('<p>Chart</p>')

		expect(html).toContain('<p>Fine</p>')
	})

	it('shows nothing in place of actions that suspend, and keeps the board', async () => {
		const never = new Promise<never>(() => {})

		function Waiting(): ReactNode {
			return use(never)
		}

		// A child that suspends needs an awaited act.
		await act(async () => {
			renderUI(
				<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
					<DashboardTile id="a" title="Revenue" actions={<Waiting />}>
						<p>Chart</p>
					</DashboardTile>

					<DashboardTile id="b" title="Traffic">
						<p>Fine</p>
					</DashboardTile>
				</Dashboard>,
			)
		})

		const revenue = screen.getByRole('group', { name: 'Revenue' })

		expect(revenue).toHaveTextContent('Chart')

		expect(bySlot(revenue, 'dashboard-tile-actions')).toBeEmptyDOMElement()

		expect(screen.getByText('Fine')).toBeInTheDocument()
	})
})

describe('Dashboard gesture owner', () => {
	/** Lets the keyboard sensor attach its keys after a lift, and lets dnd-kit tear down after a drop. */
	const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

	/** Lifts the tile of the grip `name` with Space, then presses `code` `steps` times. */
	async function lift(name: string, code = 'ArrowRight', steps = 0): Promise<HTMLElement> {
		const grip = screen.getByRole('button', { name })

		grip.focus()

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		await tick()

		for (let step = 0; step < steps; step++) fireEvent.keyDown(grip, { code, key: code })

		return grip
	}

	/** Drops the drag of `grip` with Space. */
	async function drop(grip: HTMLElement): Promise<void> {
		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		await tick()
	}

	/** The painted grid area of the tile that holds `element`. */
	function areaOf(element: HTMLElement): string {
		const shell = element.closest<HTMLElement>('[data-slot="dashboard-tile"]')

		return shell?.style.gridArea ?? ''
	}

	/** A controlled board that saves each commit, and reports it to `onLayout`. */
	function Controlled({
		editing = true,
		onLayout,
		onDragEnd,
	}: {
		editing?: boolean
		onLayout: (next: DashboardLayoutItem[]) => void
		onDragEnd?: DashboardProps['onDragEnd']
	}) {
		const [value, setValue] = useState(LAYOUT)

		return (
			<Board
				editing={editing}
				onDragEnd={onDragEnd}
				layout={{
					value,
					onValueChange: (next) => {
						onLayout(next)

						setValue(next)
					},
				}}
			/>
		)
	}

	it('ends the settle phase of a drop whose onValueChange throws', async () => {
		const failure = new Error('The save failed.')

		const onValueChange = vi.fn(() => {
			throw failure
		})

		// dnd-kit runs the drop in an async handler, so the throw escapes as a rejection.
		const rejections: unknown[] = []

		const onRejection = (reason: unknown) => {
			rejections.push(reason)
		}

		process.on('unhandledRejection', onRejection)

		onTestFinished(() => {
			process.off('unhandledRejection', onRejection)
		})

		const { rerender } = renderUI(<Board editing layout={{ value: LAYOUT, onValueChange }} />)

		// Twelve columns to the right, Revenue covers the cell of Traffic.
		await drop(await lift('Move Revenue', 'ArrowRight', 12))

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(rejections).toEqual([failure])

		// The app kept its layout, so each tile paints its saved cell.
		expect(areaOf(screen.getByRole('group', { name: 'Revenue' }))).toBe('1 / 1 / span 27 / span 12')

		expect(areaOf(screen.getByRole('group', { name: 'Traffic' }))).toBe(
			'1 / 13 / span 27 / span 12',
		)

		const moved = LAYOUT.map((item) => (item.id === 'c' ? { ...item, y: 40 } : item))

		rerender(<Board editing layout={{ value: moved, onValueChange }} />)

		expect(areaOf(screen.getByTestId('content-c'))).toBe('41 / 1 / span 20 / span 8')
	})

	it('refuses a splitter step during a drag, so the drop commits alone and ends once', async () => {
		const onLayout = vi.fn()

		const onDragEnd = vi.fn()

		renderUI(<Controlled onLayout={onLayout} onDragEnd={onDragEnd} />)

		// Eight columns to the right, Revenue shifts against Traffic.
		const grip = await lift('Move Revenue', 'ArrowRight', 8)

		const [east] = screen.getAllByRole('separator', { name: 'Resize c' })

		fireEvent.keyDown(east as HTMLElement, { key: 'ArrowLeft' })

		expect(onLayout).not.toHaveBeenCalled()

		await drop(grip)

		expect(onDragEnd).toHaveBeenCalledTimes(1)

		expect(onDragEnd).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', canceled: false }))

		expect(onLayout).toHaveBeenCalledTimes(1)

		const next = onLayout.mock.lastCall?.[0] as DashboardLayoutItem[]

		// Revenue and Traffic have one size, so two tiles on one cell share an origin.
		expect(new Set(next.map((item) => `${item.x},${item.y}`)).size).toBe(next.length)

		expect(next.find((item) => item.id === 'c')).toEqual({ id: 'c', x: 0, y: 27, w: 8, h: 20 })
	})

	/** A board whose layout and tiles the test sets. It saves nothing by itself. */
	function Held({
		value,
		withC = true,
		onLayout,
		onDragEnd,
	}: {
		value: DashboardLayoutItem[]
		withC?: boolean
		onLayout: (next: DashboardLayoutItem[]) => void
		onDragEnd: DashboardProps['onDragEnd']
	}) {
		return (
			<Dashboard
				aria-label="Sales"
				editing
				layout={{ value, onValueChange: onLayout }}
				onDragEnd={onDragEnd}
			>
				<DashboardTile id="a" title="Revenue" ratio={16 / 9} />

				<DashboardTile id="b" title="Traffic" ratio={16 / 9} />

				{withC && (
					<DashboardTile id="c">
						<div data-testid="content-c" />
					</DashboardTile>
				)}
			</Dashboard>
		)
	}

	it('cancels a drop after an outside move, so the move stays', async () => {
		const onLayout = vi.fn()

		const onDragEnd = vi.fn()

		const { rerender } = renderUI(<Held value={LAYOUT} onLayout={onLayout} onDragEnd={onDragEnd} />)

		const grip = await lift('Move Revenue', 'ArrowRight', 12)

		const moved = LAYOUT.map((item) => (item.id === 'c' ? { ...item, y: 40 } : item))

		rerender(<Held value={moved} onLayout={onLayout} onDragEnd={onDragEnd} />)

		await drop(grip)

		expect(onLayout).not.toHaveBeenCalled()

		expect(onDragEnd).toHaveBeenCalledExactlyOnceWith({ id: 'a', canceled: true, layout: moved })

		expect(areaOf(screen.getByTestId('content-c'))).toBe('41 / 1 / span 20 / span 8')

		expect(areaOf(screen.getByRole('group', { name: 'Revenue' }))).toBe('1 / 1 / span 27 / span 12')
	})

	it('cancels a drop after an outside remove, so the entry stays removed', async () => {
		const onLayout = vi.fn()

		const onDragEnd = vi.fn()

		const { rerender } = renderUI(<Held value={LAYOUT} onLayout={onLayout} onDragEnd={onDragEnd} />)

		const grip = await lift('Move Revenue', 'ArrowRight', 12)

		const removed = LAYOUT.filter((item) => item.id !== 'c')

		rerender(<Held value={removed} withC={false} onLayout={onLayout} onDragEnd={onDragEnd} />)

		await drop(grip)

		expect(onLayout).not.toHaveBeenCalled()

		expect(onDragEnd).toHaveBeenCalledExactlyOnceWith({ id: 'a', canceled: true, layout: removed })
	})

	it('ends a keyboard drag as canceled when edit mode ends, so a later Space commits nothing', async () => {
		const onLayout = vi.fn()

		const onDragEnd = vi.fn()

		const { rerender } = renderUI(<Controlled onLayout={onLayout} onDragEnd={onDragEnd} />)

		await lift('Move Revenue', 'ArrowRight', 12)

		rerender(<Controlled editing={false} onLayout={onLayout} onDragEnd={onDragEnd} />)

		expect(onDragEnd).toHaveBeenCalledExactlyOnceWith({ id: 'a', canceled: true, layout: LAYOUT })

		expect(areaOf(screen.getByRole('group', { name: 'Revenue' }))).toBe('1 / 1 / span 27 / span 12')

		// The grip left with edit mode, and the keyboard sensor still listens on the document.
		fireEvent.keyDown(document, { code: 'Space', key: ' ' })

		await tick()

		expect(onLayout).not.toHaveBeenCalled()

		expect(onDragEnd).toHaveBeenCalledTimes(1)
	})

	it('ends a keyboard drag as canceled when the board unmounts, so a later Space commits nothing', async () => {
		const onLayout = vi.fn()

		const onDragEnd = vi.fn()

		const { unmount } = renderUI(<Controlled onLayout={onLayout} onDragEnd={onDragEnd} />)

		await lift('Move Revenue', 'ArrowRight', 12)

		unmount()

		expect(onDragEnd).toHaveBeenCalledExactlyOnceWith({ id: 'a', canceled: true, layout: LAYOUT })

		fireEvent.keyDown(document, { code: 'Space', key: ' ' })

		await tick()

		expect(onLayout).not.toHaveBeenCalled()

		expect(onDragEnd).toHaveBeenCalledTimes(1)
	})
})

describe('Dashboard tile ids', () => {
	/** The development error for a repeated id `a`. */
	const repeated = expect.stringContaining('Dashboard: two tiles share the id "a"')

	/** A tile that the board does not key by its id, so a change of the id keeps the instance. */
	function Tile({ id }: { id: string }) {
		return <DashboardTile id={id} title={id} />
	}

	/** Two wrapped tiles, with the ids and the keys that a test gives. */
	function Pair({ ids, keys = ['1', '2'] }: { ids: [string, string]; keys?: [string, string] }) {
		return (
			<Dashboard aria-label="Sales">
				<Tile key={keys[0]} id={ids[0]} />

				<Tile key={keys[1]} id={ids[1]} />
			</Dashboard>
		)
	}

	it('logs an error in development that names the id of two mounted tiles', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		renderUI(<Pair ids={['a', 'a']} />)

		expect(error).toHaveBeenCalledWith(repeated)
	})

	it('stays silent under StrictMode, which runs each effect a second time', () => {
		const error = vi.spyOn(console, 'error')

		renderUI(
			<StrictMode>
				<Board />
			</StrictMode>,
		)

		expect(error).not.toHaveBeenCalled()
	})

	it('stays silent when two tiles swap their ids, or a tile replaces another, in one commit', () => {
		const error = vi.spyOn(console, 'error')

		const { rerender } = renderUI(<Pair ids={['a', 'b']} />)

		// The cleanup of each old registration runs before each new one.
		rerender(<Pair ids={['b', 'a']} />)

		rerender(<Pair ids={['b', 'a']} keys={['3', '2']} />)

		expect(error).not.toHaveBeenCalled()

		// A tile with no entry paints only while it is registered, so both tiles stay registered.
		expect(screen.getByRole('group', { name: 'a' })).toBeInTheDocument()

		expect(screen.getByRole('group', { name: 'b' })).toBeInTheDocument()
	})
})

describe('Dashboard scope', () => {
	type Sale = { region: string; amount: number }

	const sales: Sale[] = [
		{ region: 'North', amount: 10 },
		{ region: 'South', amount: 20 },
		{ region: 'West', amount: 30 },
	]

	function Regions() {
		const scope = useDashboardScope()

		const rows = useDashboardRows(sales)

		return (
			<div>
				{rows.map((row) => (
					<button key={row.region} type="button" onClick={() => scope.select('region', row.region)}>
						{row.region}
					</button>
				))}
			</div>
		)
	}

	function Total({ testId }: { testId: string }) {
		const rows = useDashboardRows(sales)

		return <output data-testid={testId}>{rows.reduce((sum, row) => sum + row.amount, 0)}</output>
	}

	it('cross-filters the other tiles, and leaves the source tile whole', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Dashboard aria-label="Sales" selection={{ onValueChange }}>
				<DashboardTile id="regions" title="Regions">
					<Regions />
				</DashboardTile>

				<DashboardTile id="total" title="Total">
					<Total testId="total" />
				</DashboardTile>
			</Dashboard>,
		)

		expect(screen.getByTestId('total')).toHaveTextContent('60')

		fireEvent.click(screen.getByRole('button', { name: 'South' }))

		expect(screen.getByTestId('total')).toHaveTextContent('20')

		// The source keeps each region, so the user can change the selection.
		expect(screen.getAllByRole('button', { name: /North|South|West/ })).toHaveLength(3)

		expect(onValueChange).toHaveBeenLastCalledWith([
			{ source: 'regions', field: 'region', values: ['South'] },
		])

		fireEvent.click(screen.getByRole('button', { name: 'South' }))

		expect(screen.getByTestId('total')).toHaveTextContent('60')
	})

	it('offers a clear control on the tile that holds a selection', () => {
		renderUI(
			<Dashboard aria-label="Sales">
				<DashboardTile id="regions" title="Regions">
					<Regions />
				</DashboardTile>

				<DashboardTile id="total" title="Total">
					<Total testId="total" />
				</DashboardTile>
			</Dashboard>,
		)

		expect(screen.queryByRole('button', { name: /Clear the selection/ })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'West' }))

		expect(screen.getByTestId('total')).toHaveTextContent('30')

		fireEvent.click(screen.getByRole('button', { name: 'Clear the selection in Regions' }))

		expect(screen.getByTestId('total')).toHaveTextContent('60')

		expect(screen.queryByRole('button', { name: /Clear the selection/ })).not.toBeInTheDocument()
	})

	it('stops applying the selection of a tile that leaves the board, and applies it again on return', () => {
		function Board({ regions }: { regions: boolean }) {
			return (
				<Dashboard aria-label="Sales">
					{regions && (
						<DashboardTile id="regions" title="Regions">
							<Regions />
						</DashboardTile>
					)}

					<DashboardTile id="total" title="Total">
						<Total testId="total" />
					</DashboardTile>
				</Dashboard>
			)
		}

		const { rerender } = renderUI(<Board regions />)

		fireEvent.click(screen.getByRole('button', { name: 'West' }))

		expect(screen.getByTestId('total')).toHaveTextContent('30')

		// No Clear control is left for the selection, so it must stop applying.
		rerender(<Board regions={false} />)

		expect(screen.getByTestId('total')).toHaveTextContent('60')

		// The selection value keeps it, so a tile that returns gets it back.
		rerender(<Board regions />)

		expect(screen.getByTestId('total')).toHaveTextContent('30')
	})

	it('applies a saved selection in the server markup', () => {
		const html = renderToString(
			<Dashboard
				aria-label="Sales"
				layout={{
					defaultValue: [
						{ id: 'regions', x: 0, y: 0, w: 12, h: 10 },
						{ id: 'total', x: 12, y: 0, w: 12, h: 10 },
					],
				}}
				selection={{ defaultValue: [{ source: 'regions', field: 'region', values: ['West'] }] }}
			>
				<DashboardTile id="regions" title="Regions">
					<Regions />
				</DashboardTile>

				<DashboardTile id="total" title="Total">
					<Total testId="total" />
				</DashboardTile>
			</Dashboard>,
		)

		expect(html).toMatch(/data-testid="total"[^>]*>30</)
	})

	it('applies the filter that the app owns to each tile', () => {
		renderUI(
			<Dashboard
				aria-label="Sales"
				filter={{
					value: {
						id: 'f',
						type: 'group',
						children: [{ id: 'r', type: 'rule', field: 'amount', operator: 'gte', value: 20 }],
					},
				}}
			>
				<DashboardTile id="total" title="Total">
					<Total testId="total" />
				</DashboardTile>
			</Dashboard>,
		)

		expect(screen.getByTestId('total')).toHaveTextContent('50')
	})
})
