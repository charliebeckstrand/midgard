import { act } from '@testing-library/react'
import { createRef, type Ref } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardGestureEndEvent,
	type DashboardGestureStartEvent,
	type DashboardHandle,
	type DashboardLayoutItem,
	DashboardTile,
} from '../../modules/dashboard'
import { fireEvent, getSlot, renderUI, screen } from '../helpers'
import { stubCanvasWidth, useControlledLayout } from '../helpers/dashboard-board'

stubCanvasWidth()

const LAYOUT: DashboardLayoutItem[] = [{ id: 'a', x: 0, y: 0, w: 8, h: 10 }]

/** The spies of one board. */
type Spies = {
	onLayout: (next: DashboardLayoutItem[]) => void
	onResizeStart: (event: DashboardGestureStartEvent) => void
	onResizeEnd: (event: DashboardGestureEndEvent) => void
}

/** A controlled board with one free-form tile and no width floor. */
function Board({ editing = true, spies }: { editing?: boolean; spies: Spies }) {
	return (
		<Dashboard
			aria-label="Board"
			editing={editing}
			layout={useControlledLayout(LAYOUT, spies.onLayout)}
			onResizeStart={spies.onResizeStart}
			onResizeEnd={spies.onResizeEnd}
		>
			<DashboardTile id="a" title="Revenue" minWidth={0} />
		</Dashboard>
	)
}

/** A board whose layout the test sets. It saves nothing by itself. */
function Held({ value, spies }: { value: DashboardLayoutItem[]; spies: Spies }) {
	return (
		<Dashboard
			aria-label="Board"
			editing
			layout={{ value, onValueChange: spies.onLayout }}
			onResizeStart={spies.onResizeStart}
			onResizeEnd={spies.onResizeEnd}
		>
			<DashboardTile id="a" title="Revenue" minWidth={0} />
		</Dashboard>
	)
}

/** Fresh spies for one case. */
function makeSpies() {
	return { onLayout: vi.fn(), onResizeStart: vi.fn(), onResizeEnd: vi.fn() }
}

/** The east splitter of the tile. */
function eastSplitter(): HTMLElement {
	const [east] = screen.getAllByRole('separator', { name: 'Resize Revenue' })

	if (east === undefined) throw new Error('The tile has no east splitter.')

	return east
}

/** The painted grid area of the tile. */
function area(container: HTMLElement): string {
	return getSlot(container, 'dashboard-tile').style.gridArea
}

/** Presses the east splitter and moves it 100 px to the right, two columns at a 50 px pitch. */
function pressAndMove(east: HTMLElement): void {
	fireEvent.pointerDown(east, { pointerId: 1, button: 0, clientX: 400, clientY: 0 })

	fireEvent.pointerMove(east, { pointerId: 1, clientX: 500, clientY: 0 })
}

describe('Dashboard pointer resize', () => {
	it('commits the east edge once, with one start and one end', () => {
		const spies = makeSpies()

		const { container } = renderUI(<Board spies={spies} />)

		const east = eastSplitter()

		pressAndMove(east)

		expect(spies.onResizeStart).toHaveBeenCalledExactlyOnceWith({ id: 'a', layout: LAYOUT })

		expect(east).toHaveAttribute('data-resizing')

		expect(area(container)).toBe('1 / 1 / span 10 / span 10')

		fireEvent.pointerUp(east, { pointerId: 1 })

		const committed = [{ id: 'a', x: 0, y: 0, w: 10, h: 10 }]

		expect(spies.onLayout).toHaveBeenCalledExactlyOnceWith(committed)

		expect(spies.onResizeEnd).toHaveBeenCalledExactlyOnceWith({
			id: 'a',
			canceled: false,
			layout: committed,
		})

		expect(east.hasPointerCapture(1)).toBe(false)

		// The gesture detached its listeners, so a late release ends nothing again.
		fireEvent.pointerUp(east, { pointerId: 1 })

		fireEvent.lostPointerCapture(east, { pointerId: 1 })

		expect(spies.onResizeEnd).toHaveBeenCalledTimes(1)

		expect(spies.onLayout).toHaveBeenCalledTimes(1)

		expect(area(container)).toBe('1 / 1 / span 10 / span 10')
	})

	it('reverts the preview on Escape, and ends as canceled', () => {
		const spies = makeSpies()

		const { container } = renderUI(<Board spies={spies} />)

		const east = eastSplitter()

		pressAndMove(east)

		expect(area(container)).toBe('1 / 1 / span 10 / span 10')

		const passed = fireEvent.keyDown(document.body, { key: 'Escape' })

		// The resize takes the press, so no surface around the board also closes.
		expect(passed).toBe(false)

		expect(area(container)).toBe('1 / 1 / span 10 / span 8')

		expect(east.hasPointerCapture(1)).toBe(false)

		expect(spies.onLayout).not.toHaveBeenCalled()

		expect(spies.onResizeEnd).toHaveBeenCalledExactlyOnceWith({
			id: 'a',
			canceled: true,
			layout: LAYOUT,
		})

		// The gesture detached its window listener, so a later Escape passes.
		expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true)
	})

	it.each([
		['pointercancel', (east: HTMLElement) => fireEvent.pointerCancel(east, { pointerId: 1 })],
		[
			'lostpointercapture',
			(east: HTMLElement) => fireEvent.lostPointerCapture(east, { pointerId: 1 }),
		],
	])('reverts the preview on %s, and ends as canceled', (_, end) => {
		const spies = makeSpies()

		const { container } = renderUI(<Board spies={spies} />)

		const east = eastSplitter()

		pressAndMove(east)

		end(east)

		expect(area(container)).toBe('1 / 1 / span 10 / span 8')

		expect(spies.onLayout).not.toHaveBeenCalled()

		expect(spies.onResizeEnd).toHaveBeenCalledExactlyOnceWith({
			id: 'a',
			canceled: true,
			layout: LAYOUT,
		})
	})

	it('cancels a release after an outside move, so the move stays', () => {
		const spies = makeSpies()

		const { container, rerender } = renderUI(<Held value={LAYOUT} spies={spies} />)

		const east = eastSplitter()

		pressAndMove(east)

		const moved = [{ id: 'a', x: 0, y: 30, w: 8, h: 10 }]

		rerender(<Held value={moved} spies={spies} />)

		fireEvent.pointerUp(east, { pointerId: 1 })

		expect(spies.onLayout).not.toHaveBeenCalled()

		expect(spies.onResizeEnd).toHaveBeenCalledExactlyOnceWith({
			id: 'a',
			canceled: true,
			layout: moved,
		})

		expect(area(container)).toBe('31 / 1 / span 10 / span 8')
	})

	it('ends a resize as canceled when edit mode ends, and detaches its listeners', () => {
		const spies = makeSpies()

		const { container, rerender } = renderUI(<Board spies={spies} />)

		const east = eastSplitter()

		pressAndMove(east)

		// The splitter unmounts, so its own listeners can no longer end the gesture.
		rerender(<Board editing={false} spies={spies} />)

		expect(east).not.toBeInTheDocument()

		expect(area(container)).toBe('1 / 1 / span 10 / span 8')

		expect(east.hasPointerCapture(1)).toBe(false)

		expect(spies.onLayout).not.toHaveBeenCalled()

		expect(spies.onResizeEnd).toHaveBeenCalledExactlyOnceWith({
			id: 'a',
			canceled: true,
			layout: LAYOUT,
		})

		expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true)
	})

	it('ends a resize as canceled when the board unmounts, and detaches its listeners', () => {
		const spies = makeSpies()

		const { unmount } = renderUI(<Board spies={spies} />)

		const east = eastSplitter()

		pressAndMove(east)

		unmount()

		expect(east.hasPointerCapture(1)).toBe(false)

		expect(spies.onLayout).not.toHaveBeenCalled()

		expect(spies.onResizeEnd).toHaveBeenCalledExactlyOnceWith({
			id: 'a',
			canceled: true,
			layout: LAYOUT,
		})

		expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true)
	})

	/** A board with Revenue under a gap and Traffic beside it. The test sets the layout and the tiles. */
	function Pair({
		value,
		withTraffic = true,
		board,
		spies,
	}: {
		value: DashboardLayoutItem[]
		withTraffic?: boolean
		board: Ref<DashboardHandle>
		spies: Spies
	}) {
		return (
			<Dashboard
				ref={board}
				aria-label="Board"
				editing
				layout={{ value, onValueChange: spies.onLayout }}
				onResizeStart={spies.onResizeStart}
				onResizeEnd={spies.onResizeEnd}
			>
				<DashboardTile id="a" title="Revenue" minWidth={0} />

				{withTraffic && <DashboardTile id="b" title="Traffic" minWidth={0} />}
			</Dashboard>
		)
	}

	it('ends a resize as canceled when the app removes its tile, and frees the board', () => {
		const spies = makeSpies()

		const board = createRef<DashboardHandle>()

		const pair: DashboardLayoutItem[] = [
			{ id: 'a', x: 0, y: 10, w: 8, h: 10 },
			{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
		]

		const { container, rerender } = renderUI(<Pair value={pair} board={board} spies={spies} />)

		const [east] = screen.getAllByRole('separator', { name: 'Resize Traffic' })

		if (east === undefined) throw new Error('Traffic has no east splitter.')

		pressAndMove(east)

		const removed = pair.filter((item) => item.id !== 'b')

		rerender(<Pair value={removed} withTraffic={false} board={board} spies={spies} />)

		expect(spies.onResizeEnd).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ id: 'b', canceled: true }),
		)

		expect(east.hasPointerCapture(1)).toBe(false)

		expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true)

		let moved = false

		act(() => {
			moved = board.current?.tidy() ?? false
		})

		expect(moved).toBe(true)

		expect(spies.onLayout).toHaveBeenCalledExactlyOnceWith([{ id: 'a', x: 0, y: 0, w: 8, h: 10 }])

		// The app keeps its own layout, and moves Revenue down.
		rerender(
			<Pair
				value={[{ id: 'a', x: 0, y: 30, w: 8, h: 10 }]}
				withTraffic={false}
				board={board}
				spies={spies}
			/>,
		)

		expect(area(container)).toBe('31 / 1 / span 10 / span 8')

		expect(spies.onResizeEnd).toHaveBeenCalledTimes(1)
	})

	it('starts nothing on a secondary button', () => {
		const spies = makeSpies()

		const { container } = renderUI(<Board spies={spies} />)

		const east = eastSplitter()

		fireEvent.pointerDown(east, { pointerId: 1, button: 2, clientX: 400, clientY: 0 })

		fireEvent.pointerMove(east, { pointerId: 1, clientX: 500, clientY: 0 })

		fireEvent.pointerUp(east, { pointerId: 1 })

		expect(east.hasPointerCapture(1)).toBe(false)

		expect(area(container)).toBe('1 / 1 / span 10 / span 8')

		expect(spies.onResizeStart).not.toHaveBeenCalled()

		expect(spies.onResizeEnd).not.toHaveBeenCalled()

		expect(spies.onLayout).not.toHaveBeenCalled()
	})
})
