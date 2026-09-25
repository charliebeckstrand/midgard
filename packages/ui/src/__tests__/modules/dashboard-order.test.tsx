import { Fragment, type ReactNode, StrictMode, useCallback, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardSpec,
	type DashboardSpecTile,
	DashboardTile,
	DashboardTiles,
	type DashboardTilesProps,
	DashboardWidgetProvider,
	duplicateSpecTile,
} from '../../modules/dashboard'
import { allBySlot, fireEvent, renderUI, screen, within } from '../helpers'
import { Counter } from '../helpers/dashboard-board'

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

/** Each tile in markup order: the text of `selector` in the tile, and the top grid row of the tile. */
function tileRows(container: HTMLElement, selector: string): [string, string][] {
	return allBySlot(container, 'dashboard-tile').map((tile) => [
		tile.querySelector(selector)?.textContent ?? '',
		tile.style.gridArea.split(' / ')[0] ?? '',
	])
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

	it('takes the order from the painted rows once the tiles register', () => {
		// Before a registers, it takes 18 rows, and b moves under c. Its ratio gives it 16 rows, so b fits at row 17.
		const layout: DashboardLayoutItem[] = [
			{ id: 'a', x: 0, y: 0, w: 8 },
			{ id: 'b', x: 16, y: 16, w: 8, h: 10 },
			{ id: 'c', x: 0, y: 30, w: 12, h: 10 },
		]

		const { container } = renderUI(
			<Dashboard aria-label="Board" columns={12} layout={{ value: layout }}>
				<DashboardTile id="a" title="A" ratio={2} />

				<DashboardTile id="b" title="B" />

				<DashboardTile id="c" title="C" />
			</Dashboard>,
		)

		const rows = allBySlot(container, 'dashboard-tile').map(
			(tile) => tile.style.gridArea.split(' / ')[0],
		)

		expect(rows).toEqual(['1', '17', '31'])

		expect(markupOrder(container)).toEqual(['A', 'B', 'C'])
	})

	it('renders a tile inside a Fragment in reading order, and keeps its state', () => {
		function Board({ layout, show }: { layout: DashboardLayoutItem[]; show: boolean }) {
			return (
				<Dashboard aria-label="Board" layout={{ value: layout }}>
					{show && (
						<>
							<DashboardTile id="a" title="A">
								<Counter />
							</DashboardTile>

							<DashboardTile id="b" title="B" />
						</>
					)}

					<DashboardTile id="c" title="C" />
				</Dashboard>
			)
		}

		const { container, rerender } = renderUI(<Board layout={LAYOUT} show />)

		expect(markupOrder(container)).toEqual(['B', 'A', 'C'])

		fireEvent.click(screen.getByRole('button', { name: 'Count 0' }))

		rerender(<Board layout={SWAPPED} show />)

		expect(markupOrder(container)).toEqual(['A', 'B', 'C'])

		expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument()

		rerender(<Board layout={SWAPPED} show={false} />)

		expect(markupOrder(container)).toEqual(['C'])
	})

	it('keeps the state of the children of a keyed Fragment when the Fragments trade places', () => {
		function Board({ groups }: { groups: string[] }) {
			return (
				<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
					{groups.map((group) => (
						<Fragment key={group}>
							<DashboardTile id={group} title={group.toUpperCase()} />

							<section aria-label={`Notes ${group}`}>
								<Counter />
							</section>
						</Fragment>
					))}
				</Dashboard>
			)
		}

		const { rerender } = renderUI(<Board groups={['a', 'b']} />)

		const notes = (group: string) => within(screen.getByRole('region', { name: `Notes ${group}` }))

		fireEvent.click(notes('a').getByRole('button', { name: 'Count 0' }))

		rerender(<Board groups={['b', 'a']} />)

		expect(notes('a').getByRole('button', { name: 'Count 1' })).toBeInTheDocument()

		expect(notes('b').getByRole('button', { name: 'Count 0' })).toBeInTheDocument()
	})

	it('gives a child with a key of its own and a child with no key distinct keys', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		renderUI(
			<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
				<p>First</p>

				<p key="0">Second</p>

				<DashboardTile id="a" title="A" />
			</Dashboard>,
		)

		expect(error).not.toHaveBeenCalled()

		expect(screen.getByText('First')).toBeInTheDocument()

		expect(screen.getByText('Second')).toBeInTheDocument()
	})

	it('keeps a component that renders a tile in its own slot', () => {
		function Wrapped() {
			return <DashboardTile id="a" title="A" />
		}

		const { container } = renderUI(
			<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
				<Wrapped />

				<DashboardTile id="c" title="C" />

				<DashboardTile id="b" title="B" />
			</Dashboard>,
		)

		// The board reads b before a, but the wrapper holds the first slot. b and c trade theirs.
		expect(markupOrder(container)).toEqual(['A', 'B', 'C'])
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

	it('places a new tile with no entry in markup order, also inside a Fragment, and a new mount keeps the rows', () => {
		function Board({ first }: { first: boolean }) {
			return (
				<Dashboard aria-label="Board">
					<Fragment key="top">
						{first && <DashboardTile id="x" title="X" />}

						<DashboardTile id="y" title="Y" />
					</Fragment>

					<DashboardTile id="z" title="Z" />
				</Dashboard>
			)
		}

		const { container, rerender, unmount } = renderUI(<Board first={false} />)

		rerender(<Board first />)

		// X mounts last, but it comes first in the markup, so it takes the top row.
		const rows = [
			['X', '1'],
			['Y', '19'],
			['Z', '37'],
		]

		expect(tileRows(container, '[data-slot="card-title"]')).toEqual(rows)

		unmount()

		const fresh = renderUI(<Board first />)

		expect(tileRows(fresh.container, '[data-slot="card-title"]')).toEqual(rows)
	})

	it('keeps the state of a tile that the new order moves', () => {
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

	it('places the copies of two Duplicate clicks in spec order, and a new mount gives the same rows', () => {
		const spec: DashboardSpec = {
			tiles: [
				{ id: 'a', widget: 'note', title: 'A' },
				{ id: 'b', widget: 'note', title: 'B' },
				{ id: 'c', widget: 'note', title: 'C' },
			],
			layout: LAYOUT,
		}

		function Board({ initial, editing = false }: { initial: DashboardSpec; editing?: boolean }) {
			const [current, setCurrent] = useState(initial)

			const duplicate = useCallback(
				(tile: DashboardSpecTile) => setCurrent((value) => duplicateSpecTile(value, tile.id)),
				[],
			)

			return (
				<DashboardWidgetProvider widgets={widgets}>
					<Dashboard aria-label="Board" editing={editing} layout={{ value: current.layout }}>
						<DashboardTiles tiles={current.tiles} onDuplicate={duplicate} />
					</Dashboard>
				</DashboardWidgetProvider>
			)
		}

		const { container, rerender, unmount } = renderUI(<Board initial={spec} editing />)

		fireEvent.click(screen.getByRole('button', { name: 'Duplicate C' }))

		// The second source comes higher in the spec, so its copy comes before the first copy.
		fireEvent.click(screen.getByRole('button', { name: 'Duplicate A' }))

		const rows = [
			['b', '1'],
			['a', '1'],
			['c', '11'],
			['tile-2', '21'],
			['tile-1', '31'],
		]

		// In edit mode the markup holds still, so the copies go last, in spec order.
		expect(tileRows(container, 'p')).toEqual(rows)

		rerender(<Board initial={spec} />)

		expect(tileRows(container, 'p')).toEqual(rows)

		unmount()

		// The spec that the two clicks saved. No gesture ran, so the copies have no entry.
		const saved = duplicateSpecTile(duplicateSpecTile(spec, 'c'), 'a')

		const fresh = renderUI(
			<StrictMode>
				<Board initial={saved} />
			</StrictMode>,
		)

		expect(tileRows(fresh.container, 'p')).toEqual(rows)
	})

	it('gives the spec tiles of a component the rows of their markup, before a JSX tile after them', () => {
		const tiles: DashboardSpecTile[] = ['s1', 's2', 's3'].map((id) => ({ id, widget: 'note' }))

		function Group() {
			return (
				<>
					<DashboardTiles tiles={tiles} />

					<DashboardTile id="j">
						<p>j</p>
					</DashboardTile>
				</>
			)
		}

		const { container } = renderUI(
			<DashboardWidgetProvider widgets={widgets}>
				<Dashboard aria-label="Board">
					<Group />
				</Dashboard>
			</DashboardWidgetProvider>,
		)

		// The component holds one slot, so its four tiles tie and take their rows in mount order.
		expect(tileRows(container, 'p')).toEqual([
			['s1', '1'],
			['s2', '19'],
			['s3', '37'],
			['j', '55'],
		])
	})

	it('gives the spec tiles of two DashboardTiles in one component the rows of their markup', () => {
		const first: DashboardSpecTile[] = ['a1', 'a2'].map((id) => ({ id, widget: 'note' }))

		const second: DashboardSpecTile[] = ['b1', 'b2'].map((id) => ({ id, widget: 'note' }))

		function Groups() {
			return (
				<>
					<DashboardTiles tiles={first} />

					<DashboardTiles tiles={second} />
				</>
			)
		}

		const { container } = renderUI(
			<StrictMode>
				<DashboardWidgetProvider widgets={widgets}>
					<Dashboard aria-label="Board">
						<Groups />
					</Dashboard>
				</DashboardWidgetProvider>
			</StrictMode>,
		)

		expect(tileRows(container, 'p')).toEqual([
			['a1', '1'],
			['a2', '19'],
			['b1', '37'],
			['b2', '55'],
		])
	})

	it('gives a copy in a component its spec place, before a JSX tile after the DashboardTiles', () => {
		function Board({ editing = false }: { editing?: boolean }) {
			const [current, setCurrent] = useState<DashboardSpec>({
				tiles: ['s1', 's2'].map((id) => ({ id, widget: 'note', title: id.toUpperCase() })),
				layout: [],
			})

			const duplicate = useCallback(
				(tile: DashboardSpecTile) => setCurrent((value) => duplicateSpecTile(value, tile.id)),
				[],
			)

			return (
				<DashboardWidgetProvider widgets={widgets}>
					<Dashboard aria-label="Board" editing={editing}>
						<Group tiles={current.tiles} onDuplicate={duplicate} />
					</Dashboard>
				</DashboardWidgetProvider>
			)
		}

		function Group(props: DashboardTilesProps) {
			return (
				<>
					<DashboardTiles {...props} />

					<DashboardTile id="j">
						<p>j</p>
					</DashboardTile>
				</>
			)
		}

		const { container, rerender } = renderUI(<Board editing />)

		fireEvent.click(screen.getByRole('button', { name: 'Duplicate S1' }))

		rerender(<Board />)

		// The copy mounts after j, but the DashboardTiles comes first in the component.
		expect(tileRows(container, 'p')).toEqual([
			['s1', '1'],
			['tile-1', '19'],
			['s2', '37'],
			['j', '55'],
		])
	})

	function Wrapped(props: DashboardTilesProps) {
		return <DashboardTiles {...props} />
	}

	// Each host puts the DashboardTiles under a board child that is not a DashboardTiles.
	const hosts: [string, (props: DashboardTilesProps) => ReactNode][] = [
		['in a component', (props) => <Wrapped {...props} />],
		[
			'under an inner DashboardWidgetProvider',
			(props) => (
				<DashboardWidgetProvider widgets={widgets}>
					<DashboardTiles {...props} />
				</DashboardWidgetProvider>
			),
		],
	]

	describe.each(hosts)('with the DashboardTiles %s', (_, host) => {
		function Board({ initial, editing = false }: { initial: DashboardSpec; editing?: boolean }) {
			const [current, setCurrent] = useState(initial)

			const duplicate = useCallback(
				(tile: DashboardSpecTile) => setCurrent((value) => duplicateSpecTile(value, tile.id)),
				[],
			)

			return (
				<DashboardWidgetProvider widgets={widgets}>
					<Dashboard aria-label="Board" editing={editing} layout={{ value: current.layout }}>
						{host({ tiles: current.tiles, onDuplicate: duplicate })}
					</Dashboard>
				</DashboardWidgetProvider>
			)
		}

		/** Clicks each Duplicate control of `sources` in edit mode, and returns the rows after edit mode ends. */
		function liveRows(spec: DashboardSpec, sources: string[]): [string, string][] {
			const { container, rerender, unmount } = renderUI(<Board initial={spec} editing />)

			for (const source of sources) {
				fireEvent.click(screen.getByRole('button', { name: `Duplicate ${source}` }))
			}

			rerender(<Board initial={spec} />)

			const rows = tileRows(container, 'p')

			unmount()

			return rows
		}

		/** The rows of a new mount of `spec`. */
		function freshRows(spec: DashboardSpec): [string, string][] {
			const { container } = renderUI(
				<StrictMode>
					<Board initial={spec} />
				</StrictMode>,
			)

			return tileRows(container, 'p')
		}

		const tiles: DashboardSpecTile[] = ['a', 'b', 'c'].map((id) => ({
			id,
			widget: 'note',
			title: id.toUpperCase(),
		}))

		it('places a copy after its source with no entries, and a new mount gives the same rows', () => {
			const spec: DashboardSpec = { tiles, layout: [] }

			const rows = [
				['a', '1'],
				['tile-1', '19'],
				['b', '37'],
				['c', '55'],
			]

			expect(liveRows(spec, ['A'])).toEqual(rows)

			expect(freshRows(duplicateSpecTile(spec, 'a'))).toEqual(rows)
		})

		it('places the copies of two Duplicate clicks in spec order, and a new mount gives the same rows', () => {
			const spec: DashboardSpec = { tiles, layout: LAYOUT }

			const rows = [
				['b', '1'],
				['a', '1'],
				['c', '11'],
				['tile-2', '21'],
				['tile-1', '31'],
			]

			expect(liveRows(spec, ['C', 'A'])).toEqual(rows)

			expect(freshRows(duplicateSpecTile(duplicateSpecTile(spec, 'c'), 'a'))).toEqual(rows)
		})
	})
})
