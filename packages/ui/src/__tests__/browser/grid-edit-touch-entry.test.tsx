import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, frames, present, renderUI } from '../helpers'

/**
 * The touch entry of a cell-scoped session against real browser events. iOS
 * shows the keyboard only for a focus that a handler of a user gesture moves.
 * Thus the editor must have focus before the handler of the lift returns, not
 * in a later task or microtask. jsdom runs each event in `act`, which flushes
 * React before it returns, so only a real browser shows this order.
 */
describe('grid touch entry (real browser)', () => {
	type Row = { id: number; name: string; done: boolean }

	const rows: Row[] = [
		{ id: 1, name: 'Alice', done: false },
		{ id: 2, name: 'Bob', done: true },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (r) => r.name },
		{ id: 'done', title: 'Done', field: 'done', cell: (r) => (r.done ? 'Yes' : 'No') },
	]

	const touch = { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }

	/**
	 * Sends the events of a tap on `target` up to the lift. The caller sends the
	 * rest with {@link endTap}, so it can read the state between them.
	 */
	function pressAndLift(target: Element) {
		target.dispatchEvent(new PointerEvent('pointerdown', touch))

		target.dispatchEvent(new PointerEvent('pointerup', touch))
	}

	/** Sends the touch end of a tap, and the mouse events and the click unless it is canceled. */
	function endTap(target: Element) {
		const proceed = target.dispatchEvent(
			new TouchEvent('touchend', { bubbles: true, cancelable: true }),
		)

		if (!proceed) return

		const mouse = { bubbles: true, cancelable: true }

		target.dispatchEvent(new MouseEvent('mousedown', mouse))
		target.dispatchEvent(new MouseEvent('mouseup', mouse))
		target.dispatchEvent(new MouseEvent('click', mouse))
	}

	function renderGrid() {
		const view = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(r) => r.id}
				editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
			/>,
		)

		const cell = (col: string) =>
			present(view.container.querySelector(`td[data-grid-col="${col}"]`), `the ${col} cell`)

		return { ...view, cell }
	}

	it.each([
		['a text editor', 'name', 'grid-edit-input'],
		['a listbox editor', 'done', 'listbox-button'],
	])('focuses %s inside the handler of the lift', async (_, col, slot) => {
		const { container, cell } = renderGrid()

		pressAndLift(cell(col))

		endTap(cell(col))

		await frames()

		expect(cell(col)).toHaveAttribute('data-active')

		pressAndLift(cell(col))

		// No await: the focus must already be in place.
		const focused = document.activeElement

		endTap(cell(col))

		expect(focused).toBe(bySlot(container, slot))

		await frames()

		expect(bySlot(container, slot)).toHaveFocus()
	})
})
