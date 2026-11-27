import { describe, expect, it, vi } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { ControlLockContext } from '../../primitives/control/context'
import { expectAnnouncement, fireEvent, renderUI, screen, within } from '../helpers'
import { lastEntry, stubCanvasWidth, useControlledLayout } from '../helpers/dashboard-board'

/**
 * The menu of a tile in edit mode moves and resizes the tile with clicks only
 * (WCAG 2.2 SC 2.5.7). The grip and the splitters stay the drag paths.
 */

stubCanvasWidth()

/** Three free-form tiles of one span: two in the first row, and one under the first. */
const GRID: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
	{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
	{ id: 'c', x: 0, y: 10, w: 8, h: 10 },
]

type BoardProps = {
	onLayout?: (next: DashboardLayoutItem[]) => void
	initial?: DashboardLayoutItem[]
	editing?: boolean
	dir?: 'ltr' | 'rtl'
	/** The `minWidth` of each tile. A wide floor makes the board re-pack. */
	minWidth?: number
}

/** A controlled board with the {@link GRID} layout. It saves each commit. */
function Board({
	onLayout,
	initial = GRID,
	editing = true,
	dir = 'ltr',
	minWidth = 0,
}: BoardProps) {
	return (
		<div dir={dir}>
			<Dashboard
				aria-label="Sales"
				editing={editing}
				layout={useControlledLayout(initial, onLayout)}
			>
				<DashboardTile id="a" title="Revenue" minWidth={minWidth} />

				<DashboardTile id="b" title="Traffic" minWidth={minWidth} />

				<DashboardTile id="c" minWidth={minWidth} />
			</Dashboard>
		</div>
	)
}

/** Opens the menu of the tile `name`, and gives the names of its items. */
function openMenu(name: string): string[] {
	fireEvent.click(screen.getByRole('button', { name: `Arrange ${name}` }))

	return screen.getAllByRole('menuitem').map((item) => item.textContent ?? '')
}

/** Opens the menu of the tile `name`, and presses its item `item`. */
function step(name: string, item: string): void {
	openMenu(name)

	fireEvent.click(screen.getByRole('menuitem', { name: item }))
}

describe('the menu of a dashboard tile', () => {
	it('shows a menu button on each movable tile in edit mode, and none at rest', () => {
		const { rerender } = renderUI(<Board editing={false} />)

		expect(screen.queryByRole('button', { name: /^Arrange/ })).not.toBeInTheDocument()

		rerender(<Board />)

		for (const name of ['Revenue', 'Traffic', 'c']) {
			expect(screen.getByRole('button', { name: `Arrange ${name}` })).toHaveAttribute(
				'aria-haspopup',
				'menu',
			)
		}
	})

	it('shows no menu button on a static tile', () => {
		renderUI(
			<Board initial={[{ id: 'a', x: 0, y: 0, w: 8, h: 10, static: true }, ...GRID.slice(1)]} />,
		)

		expect(screen.queryByRole('button', { name: 'Arrange Revenue' })).not.toBeInTheDocument()
	})

	it('offers only the steps that change the board, the moves first', () => {
		renderUI(<Board />)

		// "Revenue" is in the top-left corner, with "Traffic" to its right and "c" under it.
		expect(openMenu('Revenue')).toEqual([
			'Move right',
			'Move down',
			'Decrease width',
			'Decrease height',
		])

		expect(within(screen.getByRole('menu')).getAllByRole('separator')).toHaveLength(1)
	})

	it('moves a tile with clicks only, and tells the live region', async () => {
		const onLayout = vi.fn()

		renderUI(<Board onLayout={onLayout} />)

		step('Revenue', 'Move right')

		expect(lastEntry(onLayout, 'a')).toMatchObject({ x: 8, y: 0 })

		expect(lastEntry(onLayout, 'b')).toMatchObject({ x: 0, y: 0 })

		await expectAnnouncement('Revenue moved to column 9 of 24, row 1, 8 columns wide.')

		// The focus goes back to the button, so the next step is one press away.
		expect(screen.getByRole('button', { name: 'Arrange Revenue' })).toHaveFocus()

		// Nothing is under the tile now, so a step down moves it one row, as the arrow key does.
		step('Revenue', 'Move down')

		expect(lastEntry(onLayout, 'a')).toMatchObject({ x: 8, y: 1 })
	})

	it('resizes a tile with clicks only, and tells the live region', async () => {
		const onLayout = vi.fn()

		renderUI(<Board onLayout={onLayout} />)

		step('Revenue', 'Decrease width')

		expect(lastEntry(onLayout, 'a')).toMatchObject({ w: 7, h: 10 })

		await expectAnnouncement('Revenue resized to 7 columns wide.')

		step('Revenue', 'Decrease height')

		expect(lastEntry(onLayout, 'a')).toMatchObject({ w: 7, h: 9 })

		await expectAnnouncement('Revenue resized to 9 rows high.')

		step('Revenue', 'Increase width')

		expect(lastEntry(onLayout, 'a')).toMatchObject({ w: 8, h: 9 })
	})

	it('names the side of the screen in a right-to-left board', () => {
		const onLayout = vi.fn()

		renderUI(<Board dir="rtl" onLayout={onLayout} />)

		// Column 0 is on the right, so "Traffic" is on the left of "Revenue".
		expect(openMenu('Revenue')).toContain('Move left')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Move left' }))

		expect(lastEntry(onLayout, 'a')).toMatchObject({ x: 8, y: 0 })
	})

	it('moves a tile one place in reading order in the re-pack, and offers no size step', () => {
		const onLayout = vi.fn()

		// At a 50 px pitch, 8 columns hold 400 px, under the floor of each tile.
		renderUI(<Board minWidth={600} onLayout={onLayout} />)

		expect(openMenu('Traffic')).toEqual(['Move up', 'Move down'])

		fireEvent.click(screen.getByRole('menuitem', { name: 'Move up' }))

		expect(lastEntry(onLayout, 'b')).toMatchObject({ x: 0, y: 0 })
	})

	it('opens no menu in a locked scope', () => {
		const onLayout = vi.fn()

		renderUI(
			<ControlLockContext value>
				<Board onLayout={onLayout} />
			</ControlLockContext>,
		)

		const button = screen.getByRole('button', { name: 'Arrange Revenue' })

		// A locked button keeps its focus and its place in the tab order, as a locked grip does.
		expect(button).toHaveAttribute('aria-disabled', 'true')

		fireEvent.click(button)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		expect(onLayout).not.toHaveBeenCalled()
	})

	it('floats the button on the end corner of a tile with no header row', () => {
		renderUI(<Board />)

		expect(screen.getByRole('button', { name: 'Arrange c' })).toHaveClass('absolute', 'end-3')

		expect(screen.getByRole('button', { name: 'Arrange Revenue' })).not.toHaveClass('absolute')
	})
})
