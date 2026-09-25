import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardGestureEndEvent,
	type DashboardGestureStartEvent,
	type DashboardLayoutItem,
	DashboardTile,
} from '../../modules/dashboard'
import { fireEvent, getSlot, renderUI, screen } from '../helpers'

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

beforeEach(() => {
	// jsdom lays nothing out, so each element reports a 1200 px width: a 50 px pitch.
	Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 1200 })
})

afterEach(() => {
	if (originalClientWidth)
		Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth)
})

const LAYOUT: DashboardLayoutItem[] = [{ id: 'a', x: 0, y: 0, w: 8, h: 10 }]

/** The spies of one board. */
type Spies = {
	onLayout: (next: DashboardLayoutItem[]) => void
	onResizeStart: (event: DashboardGestureStartEvent) => void
	onResizeEnd: (event: DashboardGestureEndEvent) => void
}

/** A controlled board with one free-form tile and no width floor. */
function Board({ editing = true, spies }: { editing?: boolean; spies: Spies }) {
	const [value, setValue] = useState(LAYOUT)

	return (
		<Dashboard
			aria-label="Board"
			editing={editing}
			layout={{
				value,
				onValueChange: (next) => {
					spies.onLayout(next)

					setValue(next)
				},
			}}
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
