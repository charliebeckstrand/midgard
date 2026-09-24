import { act } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardHandle,
	type DashboardLayoutItem,
	DashboardTile,
} from '../../modules/dashboard'
import { fireEvent, liveRegion, renderUI, screen } from '../helpers'

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

beforeEach(() => {
	// jsdom lays nothing out, so each element reports a 1200 px width: a 50 px pitch.
	Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 1200 })
})

afterEach(() => {
	if (originalClientWidth)
		Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth)
})

// a sits under a gap, b has a gap over it, and c is already packed under a.
const GAPPY: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 6, w: 12, h: 10 },
	{ id: 'b', x: 12, y: 20, w: 12, h: 10 },
	{ id: 'c', x: 0, y: 16, w: 12, h: 8 },
]

/** Lets the announcer write the region, which it does in a microtask. */
async function flushAnnouncer(): Promise<void> {
	await act(async () => {
		await Promise.resolve()
	})
}

function Board({
	layout,
	onLayout,
	board,
	editing = false,
}: {
	layout: DashboardLayoutItem[]
	onLayout?: (next: DashboardLayoutItem[]) => void
	board: React.Ref<DashboardHandle>
	editing?: boolean
}) {
	return (
		<Dashboard
			ref={board}
			aria-label="Sales"
			editing={editing}
			layout={{ value: layout, onValueChange: onLayout }}
		>
			<DashboardTile id="a" title="Revenue" />
			<DashboardTile id="b" title="Orders" />
			<DashboardTile id="c" title="Units" />
		</Dashboard>
	)
}

describe('DashboardHandle.tidy', () => {
	it('packs the tiles upward, commits once, and announces the moves', async () => {
		const board = createRef<DashboardHandle>()

		const onLayout = vi.fn()

		renderUI(<Board layout={GAPPY} onLayout={onLayout} board={board} />)

		let moved = false

		act(() => {
			moved = board.current?.tidy() ?? false
		})

		expect(moved).toBe(true)

		expect(onLayout).toHaveBeenCalledTimes(1)

		expect(onLayout).toHaveBeenCalledWith([
			{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
			{ id: 'b', x: 12, y: 0, w: 12, h: 10 },
			{ id: 'c', x: 0, y: 10, w: 12, h: 8 },
		])

		await flushAnnouncer()

		expect(liveRegion()).toHaveTextContent('Tidied the board. Moved 3 tiles up.')
	})

	it('changes nothing on a packed board, and says so', async () => {
		const board = createRef<DashboardHandle>()

		const onLayout = vi.fn()

		const packed: DashboardLayoutItem[] = [
			{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
			{ id: 'b', x: 12, y: 0, w: 12, h: 10 },
			{ id: 'c', x: 0, y: 10, w: 12, h: 8 },
		]

		renderUI(<Board layout={packed} onLayout={onLayout} board={board} />)

		let moved = true

		act(() => {
			moved = board.current?.tidy() ?? true
		})

		expect(moved).toBe(false)

		expect(onLayout).not.toHaveBeenCalled()

		await flushAnnouncer()

		expect(liveRegion()).toHaveTextContent('The board is already tidy.')
	})

	it('keeps the saved place of a tile that is not mounted', () => {
		const board = createRef<DashboardHandle>()

		const onLayout = vi.fn()

		const layout: DashboardLayoutItem[] = [
			{ id: 'gone', x: 0, y: 0, w: 24, h: 6 },
			{ id: 'a', x: 0, y: 12, w: 12, h: 10 },
		]

		renderUI(
			<Dashboard ref={board} aria-label="Sales" layout={{ value: layout, onValueChange: onLayout }}>
				<DashboardTile id="a" title="Revenue" />
			</Dashboard>,
		)

		act(() => {
			board.current?.tidy()
		})

		expect(onLayout).toHaveBeenCalledWith([
			{ id: 'gone', x: 0, y: 0, w: 24, h: 6 },
			{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
		])
	})

	it('writes no height for a tile with a fixed ratio', () => {
		const board = createRef<DashboardHandle>()

		const onLayout = vi.fn()

		renderUI(
			<Dashboard
				ref={board}
				aria-label="Sales"
				layout={{ value: [{ id: 'a', x: 0, y: 8, w: 12 }], onValueChange: onLayout }}
			>
				<DashboardTile id="a" title="Revenue" ratio={16 / 9} />
			</Dashboard>,
		)

		act(() => {
			board.current?.tidy()
		})

		expect(onLayout).toHaveBeenCalledWith([{ id: 'a', x: 0, y: 0, w: 12 }])
	})

	it('does nothing during a drag', async () => {
		const board = createRef<DashboardHandle>()

		const onLayout = vi.fn()

		renderUI(<Board layout={GAPPY} onLayout={onLayout} board={board} editing />)

		const grip = screen.getByRole('button', { name: 'Move Revenue' })

		grip.focus()

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		let moved = true

		act(() => {
			moved = board.current?.tidy() ?? true
		})

		expect(moved).toBe(false)

		// The keyboard sensor attaches its keys on a timer after the lift.
		await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

		fireEvent.keyDown(grip, { code: 'Escape', key: 'Escape' })

		expect(onLayout).not.toHaveBeenCalled()
	})
})
