import { type ReactNode, useCallback, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardSpec,
	type DashboardSpecTile,
	DashboardTile,
	DashboardTiles,
	DashboardWidgetProvider,
	duplicateSpecTile,
	removeSpecTile,
} from '../../modules/dashboard'
import { act, bySlot, expectAnnouncement, fireEvent, renderUI, screen } from '../helpers'

const LAYOUT: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
	{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
	{ id: 'c', x: 16, y: 0, w: 8, h: 10 },
]

describe('DashboardTile actions', () => {
	function Board({
		editing = false,
		onRemove,
		onDuplicate,
		expandable,
	}: {
		editing?: boolean
		onRemove?: (id: string) => void
		onDuplicate?: (id: string) => void
		expandable?: boolean
	}) {
		return (
			<Dashboard aria-label="Sales" editing={editing} layout={{ defaultValue: LAYOUT }}>
				{['a', 'b', 'c'].map((id) => (
					<DashboardTile
						key={id}
						id={id}
						title={`Tile ${id}`}
						onRemove={onRemove && (() => onRemove(id))}
						onDuplicate={onDuplicate && (() => onDuplicate(id))}
						expandable={expandable}
					>
						<p>{`Content ${id}`}</p>
					</DashboardTile>
				))}
			</Dashboard>
		)
	}

	it('shows remove and duplicate in edit mode only, and only when the app handles them', () => {
		const { rerender } = renderUI(<Board onRemove={vi.fn()} />)

		expect(screen.queryByRole('button', { name: 'Remove Tile a' })).not.toBeInTheDocument()

		rerender(<Board editing onRemove={vi.fn()} />)

		expect(screen.getByRole('button', { name: 'Remove Tile a' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Duplicate Tile a' })).not.toBeInTheDocument()

		rerender(<Board editing onDuplicate={vi.fn()} />)

		expect(screen.getByRole('button', { name: 'Duplicate Tile a' })).toBeInTheDocument()
	})

	it('draws each control as a bare Button', () => {
		const { rerender } = renderUI(<Board expandable />)

		expect(screen.getByRole('button', { name: 'Expand Tile a' })).toHaveAttribute(
			'data-variant',
			'bare',
		)

		rerender(<Board editing onRemove={vi.fn()} onDuplicate={vi.fn()} />)

		for (const name of ['Remove Tile a', 'Duplicate Tile a']) {
			expect(screen.getByRole('button', { name })).toHaveAttribute('data-variant', 'bare')
		}
	})

	it('shows expand at rest only', () => {
		const { rerender } = renderUI(<Board expandable />)

		expect(screen.getByRole('button', { name: 'Expand Tile a' })).toBeInTheDocument()

		rerender(<Board editing expandable />)

		expect(screen.queryByRole('button', { name: 'Expand Tile a' })).not.toBeInTheDocument()
	})

	it('removes a tile, moves the focus to the next grip, and announces it', async () => {
		const onRemove = vi.fn()

		renderUI(<Board editing onRemove={onRemove} />)

		fireEvent.click(screen.getByRole('button', { name: 'Remove Tile b' }))

		expect(onRemove).toHaveBeenCalledWith('b')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move Tile c' }))

		await expectAnnouncement('Removed Tile b.')
	})

	it('moves the focus to the previous grip after the last tile, and to the board after the only tile', () => {
		const { rerender } = renderUI(<Board editing onRemove={vi.fn()} />)

		fireEvent.click(screen.getByRole('button', { name: 'Remove Tile c' }))

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move Tile b' }))

		rerender(
			<Dashboard aria-label="Sales" editing layout={{ defaultValue: LAYOUT }}>
				<DashboardTile id="a" title="Tile a" onRemove={vi.fn()} />
			</Dashboard>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Remove Tile a' }))

		expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Sales' }))
	})

	it('duplicates a tile, keeps the focus, and announces it', async () => {
		const onDuplicate = vi.fn()

		renderUI(<Board editing onDuplicate={onDuplicate} />)

		const control = screen.getByRole('button', { name: 'Duplicate Tile a' })

		control.focus()

		fireEvent.click(control)

		expect(onDuplicate).toHaveBeenCalledWith('a')

		expect(document.activeElement).toBe(control)

		await expectAnnouncement('Duplicated Tile a.')
	})

	it('expands a tile into a dialog named by its title', () => {
		renderUI(<Board expandable />)

		const expand = screen.getByRole('button', { name: 'Expand Tile b' })

		expect(expand).toHaveAttribute('aria-haspopup', 'dialog')

		expect(expand).toHaveAttribute('aria-expanded', 'false')

		fireEvent.click(expand)

		expect(expand).toHaveAttribute('aria-expanded', 'true')

		const dialog = screen.getByRole('dialog', { name: 'Tile b' })

		expect(dialog).toHaveTextContent('Content b')

		// The widget renders a second time, and the board keeps its own copy.
		expect(screen.getAllByText('Content b')).toHaveLength(2)

		fireEvent.click(screen.getByRole('button', { name: 'Close' }))

		expect(screen.queryByRole('dialog', { name: 'Tile b' })).not.toBeInTheDocument()
	})

	/** The board beside a control of the page, which can hold the focus. */
	function Page({ editing = false }: { editing?: boolean }) {
		return (
			<>
				<button type="button">Outside</button>

				<Board editing={editing} expandable />
			</>
		)
	}

	it('hands the focus to the grip of the tile when edit mode closes an open expand dialog', async () => {
		const { rerender } = renderUI(<Board expandable />)

		fireEvent.click(screen.getByRole('button', { name: 'Expand Tile b' }))

		screen.getByRole('button', { name: 'Close' }).focus()

		rerender(<Board editing expandable />)

		// The hand-off runs in a microtask.
		await act(async () => {})

		expect(screen.queryByRole('dialog')).toBeNull()

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move Tile b' }))
	})

	it('hands the focus to the board when the tile has no grip', async () => {
		const board = (editing: boolean) => (
			<Dashboard
				aria-label="Sales"
				editing={editing}
				layout={{ defaultValue: [{ id: 'a', x: 0, y: 0, w: 8, h: 10, static: true }] }}
			>
				<DashboardTile id="a" title="Tile a" expandable>
					<p>Content a</p>
				</DashboardTile>
			</Dashboard>
		)

		const { rerender } = renderUI(board(false))

		fireEvent.click(screen.getByRole('button', { name: 'Expand Tile a' }))

		screen.getByRole('button', { name: 'Close' }).focus()

		rerender(board(true))

		await act(async () => {})

		expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Sales' }))
	})

	it('keeps the focus when edit mode starts after the expand dialog closed', async () => {
		const { rerender } = renderUI(<Page />)

		fireEvent.click(screen.getByRole('button', { name: 'Expand Tile b' }))

		fireEvent.click(screen.getByRole('button', { name: 'Close' }))

		await act(async () => {})

		const outside = screen.getByRole('button', { name: 'Outside' })

		outside.focus()

		rerender(<Page editing />)

		await act(async () => {})

		expect(document.activeElement).toBe(outside)
	})

	it('names the dialog of an untitled tile by its id', () => {
		renderUI(
			<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
				<DashboardTile id="a" expandable>
					<p>Untitled</p>
				</DashboardTile>
			</Dashboard>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Expand a' }))

		expect(screen.getByRole('dialog', { name: 'a' })).toHaveTextContent('Untitled')
	})

	it('keeps the expand dialog when the description throws, and describes it by nothing', () => {
		const onTileError = vi.fn()

		function Broken(): ReactNode {
			throw new Error('boom')
		}

		vi.spyOn(console, 'error').mockImplementation(() => {})

		renderUI(
			<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }} onTileError={onTileError}>
				<DashboardTile id="a" title="Tile a" description={<Broken />} expandable>
					<p>Content a</p>
				</DashboardTile>
			</Dashboard>,
		)

		onTileError.mockClear()

		fireEvent.click(screen.getByRole('button', { name: 'Expand Tile a' }))

		const dialog = screen.getByRole('dialog', { name: 'Tile a' })

		expect(dialog).toHaveTextContent('Content a')

		// No description slot mounts, so none registers as the description of the dialog.
		expect(dialog).not.toHaveAttribute('aria-describedby')

		expect(onTileError).toHaveBeenCalledWith('a', expect.any(Error))
	})

	it('gives a tile with controls a header row, even with no title', () => {
		const { container } = renderUI(
			<Dashboard aria-label="Sales" editing layout={{ defaultValue: LAYOUT }}>
				<DashboardTile id="a" onRemove={vi.fn()} />
			</Dashboard>,
		)

		expect(bySlot(container, 'card-header')).toBeInTheDocument()

		expect(bySlot(container, 'dashboard-handle')?.className).not.toContain('absolute')
	})
})

describe('DashboardTiles actions', () => {
	const widgets = { note: { render: (tile: DashboardSpecTile) => <p>{`Note ${tile.id}`}</p> } }

	const SPEC: DashboardSpec = {
		tiles: [
			{ id: 'a', widget: 'note', title: 'A' },
			{ id: 'b', widget: 'note', title: 'B' },
		],
		layout: [
			{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
			{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
		],
	}

	function App({ onSpec }: { onSpec: (spec: DashboardSpec) => void }) {
		const [spec, setSpec] = useState(SPEC)

		const update = useCallback(
			(change: (current: DashboardSpec) => DashboardSpec) =>
				setSpec((current) => {
					const next = change(current)

					onSpec(next)

					return next
				}),
			[onSpec],
		)

		const remove = useCallback(
			(tile: DashboardSpecTile) => update((current) => removeSpecTile(current, tile.id)),
			[update],
		)

		const duplicate = useCallback(
			(tile: DashboardSpecTile) => update((current) => duplicateSpecTile(current, tile.id)),
			[update],
		)

		return (
			<DashboardWidgetProvider widgets={widgets}>
				<Dashboard aria-label="Board" editing layout={{ value: spec.layout }}>
					<DashboardTiles tiles={spec.tiles} onRemove={remove} onDuplicate={duplicate} />
				</Dashboard>
			</DashboardWidgetProvider>
		)
	}

	it('hands each action its spec tile, so the spec operations apply', () => {
		const onSpec = vi.fn()

		renderUI(<App onSpec={onSpec} />)

		fireEvent.click(screen.getByRole('button', { name: 'Duplicate A' }))

		expect(onSpec.mock.lastCall?.[0].tiles.map((tile: DashboardSpecTile) => tile.id)).toEqual([
			'a',
			'tile-1',
			'b',
		])

		fireEvent.click(screen.getByRole('button', { name: 'Remove B' }))

		const spec = onSpec.mock.lastCall?.[0] as DashboardSpec

		expect(spec.tiles.map((tile) => tile.id)).toEqual(['a', 'tile-1'])

		expect(spec.layout.map((item) => item.id)).toEqual(['a'])

		expect(screen.queryByText('Note b')).not.toBeInTheDocument()
	})
})
