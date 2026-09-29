import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI, screen, waitFor } from '../helpers'

/**
 * The pointer and the clipboard of a cell range (real browser). A drag reads
 * the cell under a real mouse with `elementFromPoint`, which jsdom does not
 * model. With no text selection, Chromium sends the copy event to the body,
 * not to the focused grid, so the grid must hear it on the document.
 */
describe('grid range pointer and clipboard (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		role: i % 2 === 0 ? 'Admin' : 'User',
	}))

	const getKey = (row: Row) => row.id

	/** The selector of the cell of a column in the row with a key. */
	const cellSelector = (key: number, column: string) =>
		`tr[data-grid-row="${key}"] td[data-grid-col="${column}"]`

	const cell = (key: number, column: string) =>
		present(
			document.querySelector<HTMLElement>(cellSelector(key, column)),
			cellSelector(key, column),
		)

	const renderGrid = async () => {
		renderUI(
			<>
				<div style={{ width: '320px' }}>
					<Grid
						navigable
						range
						virtualize={{ estimateSize: 36 }}
						maxHeight="180px"
						columns={columns}
						rows={rows}
						getKey={getKey}
					/>
				</div>
				<p data-testid="below" style={{ height: '120px', margin: 0 }}>
					Below
				</p>
			</>,
		)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())
	}

	/** The count of the cells that carry `data-in-range`. */
	const marked = () => document.querySelectorAll('td[data-in-range]').length

	it('makes a range with a drag across cells', async () => {
		await renderGrid()

		onTestFinished(() => commands.releasePointer())

		await commands.pressPointer(cellSelector(1, 'name'))

		await userEvent.hover(cell(2, 'role'))

		await waitFor(() => expect(marked()).toBe(4))

		await commands.releasePointer()

		expect(screen.getByRole('grid')).toHaveAttribute('aria-activedescendant', cell(2, 'role').id)
	})

	it('scrolls the region while the drag is past its bottom edge', async () => {
		await renderGrid()

		const region = present(
			document.querySelector<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		onTestFinished(() => commands.releasePointer())

		await commands.pressPointer(cellSelector(1, 'name'))

		await userEvent.hover(screen.getByTestId('below'))

		await waitFor(() => expect(region.scrollTop).toBeGreaterThan(100))

		await commands.releasePointer()

		// The range grew with the scroll, from the first row down.
		expect(cell(1, 'name')).not.toBeNull()

		expect(marked()).toBeGreaterThan(4)
	})

	it('copies the range through the native copy event on the focused grid', async () => {
		await renderGrid()

		const grid = screen.getByRole('grid')

		await userEvent.click(cell(1, 'name'))

		await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowRight}{/Shift}')

		expect(document.activeElement).toBe(grid)

		const written: string[] = []

		// The window hears the event after the grid's own handler wrote the text.
		const read = (event: ClipboardEvent) => {
			written.push(event.clipboardData?.getData('text/plain') ?? '')
		}

		window.addEventListener('copy', read)

		onTestFinished(() => window.removeEventListener('copy', read))

		document.execCommand('copy')

		expect(written).toEqual(['Name 1\tAdmin\nName 2\tUser'])
	})
})

/**
 * A paste of what a copy wrote, through the clipboard events of a real browser.
 * A page cannot start a native paste, so the test sends a paste event with a
 * real `DataTransfer` to the body, where Chromium sends it.
 */
describe('grid range copy and paste round trip (real browser)', () => {
	type Row = { id: number; name: string; count: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	const rows: Row[] = [
		{ id: 1, name: '=cmd', count: 1 },
		{ id: 2, name: 'Bob', count: 2 },
		{ id: 3, name: 'Carol', count: 3 },
	]

	it('pastes the copied range back with the same values', async () => {
		const onCommit = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				range
				editable={{ session: 'managed', onCommit }}
			/>,
		)

		const cell = (key: number, column: string) =>
			present(
				document.querySelector<HTMLElement>(
					`tr[data-grid-row="${key}"] td[data-grid-col="${column}"]`,
				),
				`${key} ${column}`,
			)

		await userEvent.click(cell(1, 'name'))

		await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')

		let copied = ''

		const read = (event: ClipboardEvent) => {
			copied = event.clipboardData?.getData('text/plain') ?? ''
		}

		window.addEventListener('copy', read)

		onTestFinished(() => window.removeEventListener('copy', read))

		document.execCommand('copy')

		expect(copied).toBe("'=cmd\t1")

		await userEvent.click(cell(3, 'name'))

		const data = new DataTransfer()

		data.setData('text/plain', copied)

		document.body.dispatchEvent(
			new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
		)

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 3, columnId: 'name', value: '=cmd' },
			{ rowKey: 3, columnId: 'count', value: 1 },
		])
	})
})
