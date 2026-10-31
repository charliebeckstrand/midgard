import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI, screen, waitFor } from '../helpers'

/** The selector of the cell of a column in the row with a key. */
const cellSelector = (key: number, column: string) =>
	`tr[data-grid-row="${key}"] td[data-grid-col="${column}"]`

/** The cell of a column in the row with a key. */
const cell = (key: number, column: string) =>
	present(document.querySelector<HTMLElement>(cellSelector(key, column)), cellSelector(key, column))

/**
 * Keeps the text of each copy event on the window for the current test. The window hears the
 * event after the grid's own handler wrote the text.
 *
 * @returns The texts, in the order of the copies.
 */
function captureCopies(): string[] {
	const written: string[] = []

	const read = (event: ClipboardEvent) => {
		written.push(event.clipboardData?.getData('text/plain') ?? '')
	}

	window.addEventListener('copy', read)

	onTestFinished(() => window.removeEventListener('copy', read))

	return written
}

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

	const rows: Row[] = Array.from({ length: 200 }, (_, index) => ({
		id: index + 1,
		name: `Name ${index + 1}`,
		role: index % 2 === 0 ? 'Admin' : 'User',
	}))

	const getKey = (row: Row) => row.id

	const renderGrid = vi.defineHelper(async () => {
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
	})

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

	// On macOS a Ctrl-click is the secondary click. It opens a context menu, which can take the
	// release, so a range drag that it starts would follow the pointer with no button down.
	it('makes no range with a Ctrl-drag', async () => {
		await renderGrid()

		onTestFinished(async () => {
			await commands.releasePointer()

			await userEvent.keyboard('{/Control}')
		})

		await userEvent.keyboard('{Control>}')

		await commands.pressPointer(cellSelector(1, 'name'))

		await userEvent.hover(cell(2, 'role'))

		await commands.releasePointer()

		expect(marked()).toBe(0)
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

		// The range grew with the scroll.
		expect(marked()).toBeGreaterThan(4)

		// The scroll goes on until the release arrives, so the window can unmount
		// the first row. Scroll back to it: the range starts there.
		region.scrollTop = 0

		await waitFor(() => expect(cell(1, 'name')).toHaveAttribute('data-in-range'))
	})

	it('copies the range through the native copy event on the focused grid', async () => {
		await renderGrid()

		const grid = screen.getByRole('grid')

		await userEvent.click(cell(1, 'name'))

		await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowRight}{/Shift}')

		expect(document.activeElement).toBe(grid)

		const written = captureCopies()

		document.execCommand('copy')

		expect(written).toEqual(['Name 1\tAdmin\nName 2\tUser'])
	})

	// The focus that enters the grid seats the cursor, and a copy at once after
	// it copies the seated cell. The test waits for no render between the two.
	it('copies the cell that the focus seats, at once after the focus', async () => {
		await renderGrid()

		await userEvent.tab()

		const written = captureCopies()

		expect(document.activeElement).toBe(screen.getByRole('grid'))

		document.execCommand('copy')

		expect(written).toEqual(['Name 1'])
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

		await userEvent.click(cell(1, 'name'))

		await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')

		const written = captureCopies()

		document.execCommand('copy')

		expect(written).toEqual(["'=cmd\t1"])

		await userEvent.click(cell(3, 'name'))

		const transfer = new DataTransfer()

		transfer.setData('text/plain', written[0] ?? '')

		document.body.dispatchEvent(
			new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }),
		)

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 3, columnId: 'name', value: '=cmd' },
			{ rowKey: 3, columnId: 'count', value: 1 },
		])
	})
})

/**
 * The fill keys in a real browser. Ctrl+D and Ctrl+R also belong to the
 * browser, so the grid must claim a key only when it fills.
 */
describe('grid range fill keys (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Ann' },
		{ id: 2, name: 'Ben' },
	]

	it('claims Ctrl+D when it fills, and leaves it to the browser when it does not', async () => {
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

		const claimed: boolean[] = []

		// The window hears the key after the grid's own handler.
		const read = (event: KeyboardEvent) => {
			if (event.key === 'd') claimed.push(event.defaultPrevented)
		}

		window.addEventListener('keydown', read)

		onTestFinished(() => window.removeEventListener('keydown', read))

		await userEvent.click(screen.getByText('Ann'))

		await userEvent.keyboard('{Control>}d{/Control}')

		await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}{Control>}d{/Control}')

		expect(claimed).toEqual([false, true])

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 2, columnId: 'name', value: 'Ann' },
		])
	})
})

/**
 * The drag of the fill handle (real browser). The drag reads the cell under a
 * real mouse with `elementFromPoint`, which jsdom does not model.
 */
describe('grid fill handle (real browser)', () => {
	type Row = { id: number; count: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	]

	// The first two counts make a series, and the rest differ from it.
	const rows: Row[] = Array.from({ length: 5 }, (_, index) => ({
		id: index + 1,
		count: index < 2 ? index + 1 : 0,
		name: `Name ${index + 1}`,
	}))

	const renderGrid = () => {
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

		return onCommit
	}

	it('continues a series down the rows that the drag covers', async () => {
		const onCommit = renderGrid()

		onTestFinished(() => commands.releasePointer())

		await userEvent.click(cell(1, 'count'))

		await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')

		await commands.pressPointer('[data-slot="grid-fill-handle"]')

		await userEvent.hover(cell(4, 'count'))

		await waitFor(() => expect(document.querySelectorAll('td[data-in-range]')).toHaveLength(4))

		await commands.releasePointer()

		expect(onCommit.mock.calls.flat()).toEqual([
			[{ rowKey: 3, columnId: 'count', value: 3 }],
			[{ rowKey: 4, columnId: 'count', value: 4 }],
		])
	})

	it('fills right when the drag travels further across than down', async () => {
		const onCommit = renderGrid()

		onTestFinished(() => commands.releasePointer())

		await userEvent.click(cell(2, 'count'))

		await commands.pressPointer('[data-slot="grid-fill-handle"]')

		await userEvent.hover(cell(2, 'name'))

		await commands.releasePointer()

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([{ rowKey: 2, columnId: 'name', value: 2 }])
	})
})

/**
 * The drag of the fill handle in a grouped grid (real browser). The drag
 * counts the rows that the cursor shows, so it skips the rows of a closed
 * group.
 */
describe('grid fill handle over a closed group (real browser)', () => {
	type Row = { id: number; name: string; team: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'team', title: 'Team', field: 'team', readOnly: true, cell: (row) => row.team },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', team: 'A' },
		{ id: 2, name: 'Bob', team: 'B' },
		{ id: 3, name: 'Carol', team: 'C' },
	]

	it('fills the next row that the cursor shows, past the closed group', async () => {
		const onCommit = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				groupBy={{ defaultValue: 'team' }}
				range
				editable={{ session: 'managed', onCommit }}
			/>,
		)

		onTestFinished(() => commands.releasePointer())

		await userEvent.click(screen.getByRole('button', { name: /^B \(/, expanded: true }))

		await userEvent.click(cell(1, 'name'))

		await commands.pressPointer('[data-slot="grid-fill-handle"]')

		await userEvent.hover(cell(3, 'name'))

		await commands.releasePointer()

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 3, columnId: 'name', value: 'Alice' },
		])
	})
})
