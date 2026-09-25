import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardSpecTile,
	DashboardTile,
	DashboardTiles,
	DashboardWidgetProvider,
} from '../../modules/dashboard'
import { allBySlot, fireEvent, renderUI, screen } from '../helpers'

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

beforeEach(() => {
	// jsdom lays nothing out, so each element reports a 1200 px width: a 50 px pitch.
	Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 1200 })
})

afterEach(() => {
	if (originalClientWidth)
		Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth)
})

// The board reads, left to right and top to bottom: b, a, then c.
const LAYOUT: DashboardLayoutItem[] = [
	{ id: 'a', x: 12, y: 0, w: 12, h: 10 },
	{ id: 'b', x: 0, y: 0, w: 12, h: 10 },
	{ id: 'c', x: 0, y: 10, w: 24, h: 10 },
]

// The same board with a and b swapped: a, b, then c.
const SWAPPED: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
	{ id: 'b', x: 12, y: 0, w: 12, h: 10 },
	{ id: 'c', x: 0, y: 10, w: 24, h: 10 },
]

/** The titles of the tiles in markup order. */
function markupOrder(container: HTMLElement): string[] {
	return allBySlot(container, 'dashboard-tile').map(
		(tile) => tile.querySelector('[data-slot="card-title"]')?.textContent ?? '',
	)
}

/** The grid areas of the tiles in markup order. */
function gridAreas(html: string): string[] {
	return [...html.matchAll(/grid-area:([^;"]+)/g)].map((match) => match[1] ?? '')
}

function JsxBoard({
	layout,
	editing = false,
	columns,
}: {
	layout: DashboardLayoutItem[]
	editing?: boolean
	columns?: number
}) {
	return (
		<Dashboard aria-label="Board" editing={editing} columns={columns} layout={{ value: layout }}>
			{['a', 'b', 'c'].map((id) => (
				<DashboardTile key={id} id={id} title={id.toUpperCase()}>
					<button type="button">{`Inside ${id}`}</button>
				</DashboardTile>
			))}
		</Dashboard>
	)
}

describe('Dashboard reading order', () => {
	it('renders direct tiles by row, then by column, and not in markup order', () => {
		const { container } = renderUI(<JsxBoard layout={LAYOUT} />)

		expect(markupOrder(container)).toEqual(['B', 'A', 'C'])
	})

	it('renders the reading order on the server', () => {
		const html = renderToString(<JsxBoard layout={LAYOUT} />)

		expect(html.indexOf('Inside b')).toBeLessThan(html.indexOf('Inside a'))

		expect(html.indexOf('Inside a')).toBeLessThan(html.indexOf('Inside c'))
	})

	it('renders the first entry of a repeated id on the server, at its cell and in its order', () => {
		const html = renderToString(
			<JsxBoard layout={[...SWAPPED, { id: 'a', x: 0, y: 30, w: 24, h: 10 }]} />,
		)

		expect(html.indexOf('Inside a')).toBeLessThan(html.indexOf('Inside b'))

		expect(html).toContain('grid-area:1 / 1 / span 10 / span 12')

		expect(html).not.toContain('grid-area:31 /')
	})

	it('renders each clamped entry that covers another entry on a new row on the server', () => {
		// Saved at 24 columns and shown at 12, the clamp puts b and c on a.
		const html = renderToString(
			<JsxBoard
				columns={12}
				layout={[
					{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
					{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
					{ id: 'c', x: 16, y: 0, w: 8, h: 10 },
				]}
			/>,
		)

		expect(gridAreas(html)).toEqual([
			'1 / 1 / span 10 / span 8',
			'11 / 1 / span 10 / span 8',
			'21 / 1 / span 10 / span 8',
		])
	})

	it('renders the tiles in the order of the rows that the clamp gives them', () => {
		// At 12 columns, the clamp puts b on a, so b takes the row under c.
		const layout: DashboardLayoutItem[] = [
			{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
			{ id: 'b', x: 16, y: 0, w: 8, h: 10 },
			{ id: 'c', x: 0, y: 10, w: 12, h: 10 },
		]

		const html = renderToString(<JsxBoard columns={12} layout={layout} />)

		expect(html.indexOf('Inside a')).toBeLessThan(html.indexOf('Inside c'))

		expect(html.indexOf('Inside c')).toBeLessThan(html.indexOf('Inside b'))

		expect(gridAreas(html).map((area) => area.split(' / ')[0])).toEqual(['1', '11', '21'])

		const { container } = renderUI(<JsxBoard columns={12} layout={layout} />)

		expect(markupOrder(container)).toEqual(['A', 'C', 'B'])
	})

	it('keeps each other child in its slot', () => {
		const { container } = renderUI(
			<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
				<DashboardTile id="a" title="A" />

				<p data-testid="note">Note</p>

				<DashboardTile id="b" title="B" />
			</Dashboard>,
		)

		const canvas = container.querySelector('[data-slot="dashboard-canvas"]')

		const children = [...(canvas?.children ?? [])].map(
			(child) => child.getAttribute('data-testid') ?? child.textContent,
		)

		// The two tiles trade their slots; the note stays between them.
		expect(children.slice(0, 3)).toEqual(['B', 'note', 'A'])
	})

	it('holds the markup still in edit mode, and takes the new order when edit mode ends', () => {
		const { container, rerender } = renderUI(<JsxBoard layout={LAYOUT} editing />)

		rerender(<JsxBoard layout={SWAPPED} editing />)

		expect(markupOrder(container)).toEqual(['B', 'A', 'C'])

		rerender(<JsxBoard layout={SWAPPED} />)

		expect(markupOrder(container)).toEqual(['A', 'B', 'C'])
	})

	it('keeps the state of a tile that the new order moves', () => {
		function Counter() {
			const [count, setCount] = useState(0)

			return (
				<button type="button" onClick={() => setCount((value) => value + 1)}>
					{`Count ${count}`}
				</button>
			)
		}

		function Board({ layout }: { layout: DashboardLayoutItem[] }) {
			return (
				<Dashboard aria-label="Board" layout={{ value: layout }}>
					<DashboardTile id="a" title="A">
						<Counter />
					</DashboardTile>

					<DashboardTile id="b" title="B" />

					<DashboardTile id="c" title="C" />
				</Dashboard>
			)
		}

		const { rerender } = renderUI(<Board layout={LAYOUT} />)

		fireEvent.click(screen.getByRole('button', { name: 'Count 0' }))

		rerender(<Board layout={SWAPPED} />)

		expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument()
	})
})

describe('DashboardTiles reading order', () => {
	const widgets = { note: { render: (tile: DashboardSpecTile) => <p>{tile.id}</p> } }

	it('renders the spec tiles by their place, with a tile that has no entry last', () => {
		const tiles: DashboardSpecTile[] = [
			{ id: 'new', widget: 'note', title: 'New' },
			{ id: 'c', widget: 'note', title: 'C' },
			{ id: 'a', widget: 'note', title: 'A' },
			{ id: 'b', widget: 'note', title: 'B' },
		]

		const { container } = renderUI(
			<DashboardWidgetProvider widgets={widgets}>
				<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
					<DashboardTiles tiles={tiles} />
				</Dashboard>
			</DashboardWidgetProvider>,
		)

		expect(markupOrder(container)).toEqual(['B', 'A', 'C', 'New'])
	})
})
