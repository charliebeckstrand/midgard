import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../helpers'

/**
 * A draft whose editor virtualization unmounts (real browser; jsdom renders
 * zero windowed rows). The draft belongs to the session, so a row that
 * scrolls out of the window keeps it. The editor shows it when the row
 * scrolls back, and the consumer's save commits it either way.
 */
describe('grid draft of a virtualized-out row (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	]

	const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	/** Renders row 1 open for editing, with a save button that empties the set. */
	function renderGrid() {
		const onCommit = vi.fn()

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<div style={{ width: '320px' }}>
					<button type="button" onClick={() => setEditing(new Set())}>
						save
					</button>
					<Grid
						virtualize={{ estimateSize: 36 }}
						maxHeight="180px"
						columns={columns}
						rows={rows}
						getKey={(row) => row.id}
						editable={{ rows: editing, onRowsChange: setEditing, onCommit }}
					/>
				</div>
			)
		}

		const view = renderUI(<Harness />)

		const scroll = present(
			view.container.querySelector<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		const editor = () => screen.queryByRole('textbox', { name: 'Edit Name, row 1' })

		const scrollTo = (top: number) => {
			scroll.scrollTop = top

			fireEvent.scroll(scroll)
		}

		return { onCommit, editor, scrollTo, scroll }
	}

	it('shows the draft when the row scrolls back, and commits it', async () => {
		const { onCommit, editor, scrollTo, scroll } = renderGrid()

		await waitFor(() => expect(editor()).not.toBeNull())

		fireEvent.change(present(editor(), 'editor'), { target: { value: 'Alicia' } })

		scrollTo(scroll.scrollHeight)

		await waitFor(() => expect(editor()).toBeNull())

		scrollTo(0)

		await waitFor(() => expect(editor()).not.toBeNull())

		expect(editor()).toHaveValue('Alicia')

		expect(onCommit).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'save' }))

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])
	})

	it('commits the draft of a row that is out of the window', async () => {
		const { onCommit, editor, scrollTo, scroll } = renderGrid()

		await waitFor(() => expect(editor()).not.toBeNull())

		fireEvent.change(present(editor(), 'editor'), { target: { value: 'Alicia' } })

		scrollTo(scroll.scrollHeight)

		await waitFor(() => expect(editor()).toBeNull())

		fireEvent.click(screen.getByRole('button', { name: 'save' }))

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])
	})
})
