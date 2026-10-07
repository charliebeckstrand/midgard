import { describe, expect, it, vi } from 'vitest'
import { TOUCH_TAP_SLOP } from '../../hooks/use-touch-tap'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

type Row = { id: number; name: string; count: number; done: boolean }

const rows: Row[] = [
	{ id: 1, name: 'Alice', count: 2, done: false },
	{ id: 2, name: 'Bob', count: 5, done: true },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count), readOnly: true },
	{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
]

function renderGrid(editable: Partial<GridEditableConfig> = {}) {
	const onCellClick = vi.fn()

	const view = renderUI(
		<Grid
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			onCellClick={onCellClick}
			editable={{ session: 'managed', scope: 'cell', onCommit: vi.fn(), ...editable }}
		/>,
	)

	return {
		...view,
		onCellClick,
		cell: (col: string, rowIndex = 0) =>
			view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
				rowIndex
			] as HTMLElement,
		editors: () => [
			...allBySlot(view.container, 'grid-edit-input'),
			...allBySlot(view.container, 'listbox-button'),
		],
	}
}

/**
 * Sends the compatibility mouse events that a browser makes from a touch
 * press, and its click. A canceled touch end makes none of them.
 */
function compatMouse(target: Element) {
	fireEvent.mouseDown(target)

	fireEvent.mouseUp(target)

	fireEvent.click(target)
}

/** Taps one finger on `target`, as a browser sends it. */
function tap(target: Element) {
	const at = { pointerId: 1, pointerType: 'touch', clientX: 20, clientY: 10 }

	fireEvent.pointerDown(target, at)

	fireEvent.pointerUp(target, at)

	if (fireEvent.touchEnd(target)) compatMouse(target)
}

/** Clicks `target` with a mouse, as a browser sends it. */
function click(target: Element) {
	const at = { pointerId: 1, pointerType: 'mouse', clientX: 20, clientY: 10 }

	fireEvent.pointerDown(target, at)

	fireEvent.mouseDown(target)

	fireEvent.pointerUp(target, at)

	fireEvent.mouseUp(target)

	fireEvent.click(target)
}

describe('Grid touch entry to edit', () => {
	it('selects a cell on the first tap and opens nothing', () => {
		const { cell, editors } = renderGrid()

		tap(cell('name'))

		expect(cell('name')).toHaveAttribute('data-active')

		expect(editors()).toHaveLength(0)
	})

	it('opens the selected cell on a tap and focuses its editor', () => {
		const { container, cell } = renderGrid()

		tap(cell('name'))

		tap(cell('name'))

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()
	})

	it('only selects an unselected cell when another cell is selected', () => {
		const { cell, editors } = renderGrid()

		tap(cell('name'))

		tap(cell('name', 1))

		expect(cell('name', 1)).toHaveAttribute('data-active')

		expect(editors()).toHaveLength(0)
	})

	it('opens the picker editor of a selected cell and focuses it', () => {
		const { container, cell } = renderGrid()

		tap(cell('done'))

		tap(cell('done'))

		expect(bySlot(container, 'listbox-button')).toHaveFocus()
	})

	it('opens the selected cell of a row-scope session', () => {
		const { container, cell } = renderGrid({ scope: 'row' })

		tap(cell('name'))

		tap(cell('name'))

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()
	})

	it('does not open a read-only cell', () => {
		const { cell, editors } = renderGrid()

		tap(cell('count'))

		tap(cell('count'))

		expect(editors()).toHaveLength(0)
	})

	it('does not open the selected cell when a scroll starts on it', () => {
		const { cell, editors } = renderGrid()

		tap(cell('name'))

		const at = { pointerId: 1, pointerType: 'touch', clientX: 20, clientY: 10 }

		// A pan travels past the slop, and the browser then takes the gesture.
		fireEvent.pointerDown(cell('name'), at)

		fireEvent.pointerMove(cell('name'), { ...at, clientY: at.clientY + TOUCH_TAP_SLOP + 5 })

		fireEvent.pointerCancel(cell('name'), at)

		expect(editors()).toHaveLength(0)

		// A pan that the browser does not cancel still travels.
		fireEvent.pointerDown(cell('name'), at)

		fireEvent.pointerMove(cell('name'), { ...at, clientX: at.clientX + TOUCH_TAP_SLOP + 5 })

		fireEvent.pointerUp(cell('name'), { ...at, clientX: at.clientX + TOUCH_TAP_SLOP + 5 })

		expect(editors()).toHaveLength(0)
	})

	it('keeps the click of the tap that opens a cell off the grid', () => {
		const { cell, onCellClick } = renderGrid()

		tap(cell('name'))

		expect(onCellClick).toHaveBeenCalledTimes(1)

		tap(cell('name'))

		// The editor has focus, and no click from the tap takes it back.
		expect(onCellClick).toHaveBeenCalledTimes(1)
	})

	it('does not open a selected cell on a mouse click', () => {
		const { cell, editors } = renderGrid()

		click(cell('name'))

		click(cell('name'))

		expect(cell('name')).toHaveAttribute('data-active')

		expect(editors()).toHaveLength(0)
	})

	it('does not open a selected cell on a tap in the manual mode', () => {
		const { cell, editors } = renderGrid({ session: 'manual' })

		tap(cell('name'))

		tap(cell('name'))

		expect(editors()).toHaveLength(0)
	})
})
