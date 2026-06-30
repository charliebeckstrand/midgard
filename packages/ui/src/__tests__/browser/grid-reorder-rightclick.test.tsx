import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

/**
 * The reorder grip must not begin a drag on a context-menu press. dnd-kit's
 * stock pointer sensor drops the secondary button but not a Ctrl-click — the
 * macOS secondary click — which would otherwise start a drag the opening
 * context menu strands mid-flight (its pointerup never arrives), leaving the
 * column stuck as if held. A genuine primary press must still drag.
 *
 * Activation needs real pointer events past the 3px distance constraint, so
 * this runs in the browser suite; the dragged column carries `data-dragging`.
 */
describe('grid reorder grip: context-menu press (real browser)', () => {
	type Row = { id: number; name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'age', title: 'Age', cell: (row) => row.age },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', age: 30 },
		{ id: 2, name: 'Bob', age: 25 },
	]

	const getKey = (row: Row) => row.id

	function gripHeader() {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} reorder />)

		const grip = screen.getByRole('button', { name: 'Reorder Name' })

		const header = grip.closest('th')

		if (!header) throw new Error('reorder grip is not inside a header cell')

		return { grip, header }
	}

	// Press the grip and travel past the 3px activation distance.
	function pressAndMove(grip: Element, init: PointerEventInit) {
		fireEvent.pointerDown(grip, { isPrimary: true, clientX: 50, clientY: 10, ...init })

		fireEvent.pointerMove(grip, { clientX: 70, clientY: 10, ...init })
	}

	it('does not start a drag on a plain right-click (button 2)', () => {
		const { grip, header } = gripHeader()

		pressAndMove(grip, { button: 2 })

		expect(header).not.toHaveAttribute('data-dragging')
	})

	it('does not start a drag on a macOS Ctrl+click (button 0 + ctrlKey)', () => {
		const { grip, header } = gripHeader()

		pressAndMove(grip, { button: 0, ctrlKey: true })

		expect(header).not.toHaveAttribute('data-dragging')
	})

	it('still starts a drag on a genuine primary press', () => {
		const { grip, header } = gripHeader()

		pressAndMove(grip, { button: 0 })

		expect(header).toHaveAttribute('data-dragging')
	})
})
