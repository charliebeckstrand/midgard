import { act } from '@testing-library/react'
import { createRef, type ReactElement, type RefObject } from 'react'
import { describe, expect, it, type Mock, vi } from 'vitest'
import {
	Dashboard,
	type DashboardHandle,
	type DashboardLayoutItem,
	DashboardTile,
} from '../../modules/dashboard'
import { expectAnnouncement, fireEvent, renderUI, screen } from '../helpers'
import { settleKeyboardLifts, stubCanvasWidth } from '../helpers/dashboard-board'
import { keyboardSensorAttached } from '../helpers/dnd-kit'

stubCanvasWidth()

settleKeyboardLifts()

// a sits under a gap, b has a gap over it, and c is already packed under a.
const GAPPY: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 6, w: 12, h: 10 },
	{ id: 'b', x: 12, y: 20, w: 12, h: 10 },
	{ id: 'c', x: 0, y: 16, w: 12, h: 8 },
]

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

/**
 * Renders the board that `ui` gives for a handle ref and an `onLayout` spy. Gives
 * the spy and `tidy`, which tidies the board in `act` and returns the result.
 * The result is `undefined` when the ref holds no handle.
 */
function renderTidy(
	ui: (board: RefObject<DashboardHandle | null>, onLayout: Mock) => ReactElement,
) {
	const board = createRef<DashboardHandle>()

	const onLayout = vi.fn()

	renderUI(ui(board, onLayout))

	const tidy = () => {
		let moved: boolean | undefined

		act(() => {
			moved = board.current?.tidy()
		})

		return moved
	}

	return { onLayout, tidy }
}

describe('DashboardHandle.tidy', () => {
	it('packs the tiles upward, commits once, and announces the moves', async () => {
		const { onLayout, tidy } = renderTidy((board, onLayout) => (
			<Board layout={GAPPY} onLayout={onLayout} board={board} />
		))

		expect(tidy()).toBe(true)

		expect(onLayout).toHaveBeenCalledExactlyOnceWith([
			{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
			{ id: 'b', x: 12, y: 0, w: 12, h: 10 },
			{ id: 'c', x: 0, y: 10, w: 12, h: 8 },
		])

		await expectAnnouncement('Tidied the board. Moved 3 tiles up.')
	})

	it('changes nothing on a packed board, and says so', async () => {
		const packed: DashboardLayoutItem[] = [
			{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
			{ id: 'b', x: 12, y: 0, w: 12, h: 10 },
			{ id: 'c', x: 0, y: 10, w: 12, h: 8 },
		]

		const { onLayout, tidy } = renderTidy((board, onLayout) => (
			<Board layout={packed} onLayout={onLayout} board={board} />
		))

		expect(tidy()).toBe(false)

		expect(onLayout).not.toHaveBeenCalled()

		await expectAnnouncement('The board is already tidy.')
	})

	it('keeps the saved place of a tile that is not mounted', () => {
		const layout: DashboardLayoutItem[] = [
			{ id: 'gone', x: 0, y: 0, w: 24, h: 6 },
			{ id: 'a', x: 0, y: 12, w: 12, h: 10 },
		]

		const { onLayout, tidy } = renderTidy((board, onLayout) => (
			<Dashboard ref={board} aria-label="Sales" layout={{ value: layout, onValueChange: onLayout }}>
				<DashboardTile id="a" title="Revenue" />
			</Dashboard>
		))

		tidy()

		expect(onLayout).toHaveBeenCalledWith([
			{ id: 'gone', x: 0, y: 0, w: 24, h: 6 },
			{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
		])
	})

	it('writes no height for a tile with a fixed ratio', () => {
		const { onLayout, tidy } = renderTidy((board, onLayout) => (
			<Dashboard
				ref={board}
				aria-label="Sales"
				layout={{ value: [{ id: 'a', x: 0, y: 8, w: 12 }], onValueChange: onLayout }}
			>
				<DashboardTile id="a" title="Revenue" ratio={16 / 9} />
			</Dashboard>
		))

		tidy()

		expect(onLayout).toHaveBeenCalledWith([{ id: 'a', x: 0, y: 0, w: 12 }])
	})

	it('does nothing during a drag', async () => {
		const { onLayout, tidy } = renderTidy((board, onLayout) => (
			<Board layout={GAPPY} onLayout={onLayout} board={board} editing />
		))

		const grip = screen.getByRole('button', { name: 'Move Revenue' })

		grip.focus()

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		expect(tidy()).toBe(false)

		await keyboardSensorAttached()

		fireEvent.keyDown(grip, { code: 'Escape', key: 'Escape' })

		expect(onLayout).not.toHaveBeenCalled()
	})
})
