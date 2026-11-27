import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { Grid, type GridColumn, type GridProps } from '../../modules/grid'
import { getSlot, present, renderUI, screen, waitFor } from '../helpers'

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

	const renderGrid = vi.defineHelper(async (props: Partial<GridProps<Row>> = {}) => {
		renderUI(
			<>
				<p data-testid="above" style={{ height: '120px', margin: 0 }}>
					Above
				</p>
				<div style={{ width: '320px' }}>
					<Grid
						navigable
						range
						virtualize={{ estimateSize: 36 }}
						maxHeight="180px"
						columns={columns}
						rows={rows}
						getKey={getKey}
						{...props}
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

		expect(screen.getByRole('grid')).toHaveActiveDescendant(cell(2, 'role'))
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

		const region = getSlot(document, 'grid-scroll')

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

	it('grows the range past a sticky new-row slot at the bottom edge', async () => {
		await renderGrid({
			editable: { session: 'managed', newRow: 'bottom', onRowAdd: () => {}, onCommit: () => {} },
		})

		const region = getSlot(document, 'grid-scroll')

		onTestFinished(() => commands.releasePointer())

		await commands.pressPointer(cellSelector(1, 'name'))

		await userEvent.hover(screen.getByTestId('below'))

		await waitFor(() => expect(region.scrollTop).toBeGreaterThan(300))

		await commands.releasePointer()

		// The rows that the pointer crossed scrolled out of the window. The range
		// grew with the scroll, so the rows in view are in it.
		expect(marked()).toBeGreaterThan(1)
	})

	it('grows the range past a sticky header at the top edge', async () => {
		await renderGrid({ header: { position: 'sticky' } })

		const region = getSlot(document, 'grid-scroll')

		region.scrollTop = 600

		await waitFor(() => expect(document.querySelector(cellSelector(20, 'name'))).not.toBeNull())

		onTestFinished(() => commands.releasePointer())

		await commands.pressPointer(cellSelector(20, 'name'))

		await userEvent.hover(screen.getByTestId('above'))

		await waitFor(() => expect(region.scrollTop).toBeLessThan(300))

		await commands.releasePointer()

		expect(marked()).toBeGreaterThan(1)
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
 * A paste that runs past the last row, in a real browser. The lines after the
 * last row go through the new-row slot, and its async add holds each line
 * until the one before it settles.
 */
describe('grid paste past the last row (real browser)', () => {
	type Row = { id: number; name: string; count: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', count: 1 },
		{ id: 2, name: 'Bob', count: 2 },
	]

	it('adds each line after the last row through the slot, in order', async () => {
		const onCommit = vi.fn()

		// An async add: each line waits for the promise of the line before it.
		const onRowAdd = vi.fn(() => Promise.resolve())

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				range
				editable={{ session: 'managed', newRow: 'bottom', onRowAdd, onCommit }}
			/>,
		)

		await userEvent.click(cell(2, 'name'))

		const transfer = new DataTransfer()

		transfer.setData('text/plain', 'Ben\t20\nCleo\t30\nDev\t40\n')

		document.body.dispatchEvent(
			new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }),
		)

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 2, columnId: 'name', value: 'Ben' },
			{ rowKey: 2, columnId: 'count', value: 20 },
		])

		await waitFor(() => expect(onRowAdd).toHaveBeenCalledTimes(2))

		expect(onRowAdd.mock.calls).toEqual([
			[{ name: 'Cleo', count: 30 }],
			[{ name: 'Dev', count: 40 }],
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

	// The Add column of the new-row slot holds no data, so the drag stops at the
	// last data column.
	it('fills no cell of the Add column of the new-row slot', async () => {
		const onCommit = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				range
				editable={{ session: 'managed', newRow: 'bottom', onRowAdd: () => {}, onCommit }}
			/>,
		)

		onTestFinished(() => commands.releasePointer())

		await userEvent.click(cell(2, 'name'))

		await commands.pressPointer('[data-slot="grid-fill-handle"]')

		// The Add column is the last column of the row.
		const add = present(
			document.querySelector<HTMLElement>('tr[data-grid-row="2"] td:last-child'),
			'the Add column cell of row 2',
		)

		expect(add).not.toBe(cell(2, 'name'))

		await userEvent.hover(add)

		expect(document.querySelectorAll('td[data-in-range]')).toHaveLength(1)

		expect(cell(2, 'name')).toHaveAttribute('data-in-range')

		await commands.releasePointer()

		expect(onCommit).not.toHaveBeenCalled()
	})
})

/**
 * The drag of the fill handle over a series of text and of dates (real
 * browser). The engine cases hold each rule of a series. These hold that the
 * drag writes the values of the series, in the type of their source.
 */
describe('grid fill handle over text and date series (real browser)', () => {
	type Row = { id: number; item: string; due: string; start: Date }

	const columns: GridColumn<Row>[] = [
		{ id: 'item', title: 'Item', field: 'item', cell: (row) => row.item },
		{ id: 'due', title: 'Due', field: 'due', cell: (row) => row.due },
		{
			id: 'start',
			title: 'Start',
			field: 'start',
			cell: (row) => row.start.toDateString(),
		},
	]

	// The first two rows make a series in each column, and the rest are blank.
	const rows: Row[] = [
		{ id: 1, item: 'Item 1', due: '2026-01-31', start: new Date(2026, 2, 1) },
		{ id: 2, item: 'Item 2', due: '2026-02-28', start: new Date(2026, 2, 8) },
		{ id: 3, item: '', due: '', start: new Date(2000, 0, 1) },
		{ id: 4, item: '', due: '', start: new Date(2000, 0, 1) },
	]

	/** Selects the first two rows of a column, and drags the fill handle to the last row. */
	async function dragDown(column: string) {
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

		onTestFinished(() => commands.releasePointer())

		await userEvent.click(cell(1, column))

		await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')

		await commands.pressPointer('[data-slot="grid-fill-handle"]')

		await userEvent.hover(cell(4, column))

		await waitFor(() => expect(document.querySelectorAll('td[data-in-range]')).toHaveLength(4))

		await commands.releasePointer()

		return onCommit.mock.calls.flat()
	}

	it('continues the number at the end of the text', async () => {
		expect(await dragDown('item')).toEqual([
			[{ rowKey: 3, columnId: 'item', value: 'Item 3' }],
			[{ rowKey: 4, columnId: 'item', value: 'Item 4' }],
		])
	})

	it('continues `YYYY-MM-DD` strings by months, on the last day of a short month', async () => {
		expect(await dragDown('due')).toEqual([
			[{ rowKey: 3, columnId: 'due', value: '2026-03-31' }],
			[{ rowKey: 4, columnId: 'due', value: '2026-04-30' }],
		])
	})

	it('continues `Date` values by days, as `Date` values', async () => {
		expect(await dragDown('start')).toEqual([
			[{ rowKey: 3, columnId: 'start', value: new Date(2026, 2, 15) }],
			[{ rowKey: 4, columnId: 'start', value: new Date(2026, 2, 22) }],
		])
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
