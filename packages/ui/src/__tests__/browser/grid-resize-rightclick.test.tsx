import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, waitFor } from '../helpers'

/**
 * A right-click on the column resize handle must not begin a drag-resize. The
 * engine's resize handler ends only on `mouseup`, which the context menu the
 * same press opens swallows — so a resize started on a right-click never ends,
 * leaving the column stuck tracking the pointer. Proven against real layout:
 * the column width only moves for a primary-button drag.
 */
describe('grid resize handle: right-click (real browser)', () => {
	type Row = { id: number; name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, width: '200px', minWidth: 80 },
		{ id: 'age', title: 'Age', cell: (row) => row.age, width: '120px' },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', age: 30 },
		{ id: 2, name: 'Bob', age: 25 },
	]

	const getKey = (row: Row) => row.id

	function setup() {
		const { container } = renderUI(
			<div style={{ width: '400px' }}>
				<Grid resizable columns={columns} rows={rows} getKey={getKey} />
			</div>,
		)

		const separator = container.querySelector<HTMLElement>(
			'[role="separator"][aria-label="Resize Name"]',
		)

		if (!separator) throw new Error('resize handle not found')

		const nameHeader = container.querySelector<HTMLElement>('th[data-grid-col="name"]')

		if (!nameHeader) throw new Error('name header not found')

		return { container, separator, nameHeader }
	}

	// Auto-fit sizes the columns on mount; wait for the engine width so the drag
	// starts on a settled target.
	async function settled(container: HTMLElement) {
		const table = container.querySelector('table') as HTMLElement

		await waitFor(() => expect(table.style.width).not.toBe(''))
	}

	// Both context-menu gestures: a plain right-click, and the macOS Ctrl+click
	// (button 0 + ctrlKey) that would slip past a button-only guard.
	for (const { name, init } of [
		{ name: 'right-button', init: { button: 2 } as const },
		{ name: 'Ctrl+click', init: { button: 0, ctrlKey: true } as const },
	]) {
		it(`does not resize on a ${name} drag whose mouseup the menu swallows`, async () => {
			const { container, separator, nameHeader } = setup()

			await settled(container)

			const startWidth = nameHeader.getBoundingClientRect().width

			const rect = separator.getBoundingClientRect()

			const startX = rect.left + rect.width / 2

			const y = rect.top + rect.height / 2

			// Press, then move — and never release, the way an opening context menu
			// strands the gesture.
			fireEvent.mouseDown(separator, { ...init, clientX: startX, clientY: y })

			fireEvent.mouseMove(document, { ...init, clientX: startX + 80, clientY: y })

			// No resize engaged: nothing is mid-resize and the width held.
			expect(container.querySelector('[data-resizing]')).toBeNull()

			// A further move (pointer still travelling) must not drag the column either.
			fireEvent.mouseMove(document, { clientX: startX + 160, clientY: y })

			expect(nameHeader.getBoundingClientRect().width).toBeCloseTo(startWidth, 0)
		})
	}

	it('still resizes on a primary-button drag', async () => {
		const { container, separator, nameHeader } = setup()

		await settled(container)

		const startWidth = nameHeader.getBoundingClientRect().width

		const rect = separator.getBoundingClientRect()

		const startX = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		fireEvent.mouseDown(separator, { button: 0, clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 80, clientY: y })

		fireEvent.mouseUp(document, { clientX: startX + 80, clientY: y })

		await waitFor(() =>
			expect(nameHeader.getBoundingClientRect().width).toBeGreaterThan(startWidth + 40),
		)
	})
})
