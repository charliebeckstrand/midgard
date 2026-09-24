import { act } from '@testing-library/react'
import { Profiler, type ReactNode, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	DashboardTile,
	useDashboardRows,
	useDashboardScope,
} from '../../modules/dashboard'
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
	children,
}: {
	editing?: boolean
	layout?: Parameters<typeof Dashboard>[0]['layout']
	children?: ReactNode
}) {
	return (
		<Dashboard aria-label="Sales" editing={editing} layout={layout}>
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
