import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, frames, present, renderUI, screen, waitFor } from '../helpers'

/**
 * The keyboard cursor over a virtualized grid (real browser; jsdom renders zero
 * windowed rows). A large jump (Ctrl+End) lands the cursor on a row outside the
 * rendered window — the cursor scrolls it into the window first, so the cell
 * `aria-activedescendant` names is really in the DOM (WCAG 2.1.1 / 4.1.2), not a
 * dangling reference to an unmounted row.
 */
describe('grid virtualized cursor (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	const getKey = (row: Row) => row.id

	it('scrolls an off-window row into view so the active cell stays mounted', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: 36 }}
					maxHeight="180px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		// Only a window of rows renders, not all 200 — confirm virtualization is live.
		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		expect(screen.queryByText('Name 200')).toBeNull()

		grid.focus()

		// Jump to the last row, far below the rendered window.
		fireEvent.keyDown(grid, { key: 'End', ctrlKey: true })

		// The cursor scrolled it into the window: the active descendant resolves to a
		// real cell rather than dangling at an unmounted row.
		await waitFor(() => {
			const active = grid.getAttribute('aria-activedescendant')

			expect(active).toBeTruthy()

			expect(document.getElementById(active as string)).not.toBeNull()
		})

		expect(screen.queryByText('Name 200')).not.toBeNull()
	})

	it('pages PageDown by the visible viewport, not the fixed fallback count', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: 36 }}
					maxHeight="180px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		grid.focus()

		fireEvent.keyDown(grid, { key: 'PageDown' })

		await waitFor(() => {
			const active = grid.getAttribute('aria-activedescendant')

			expect(active).toBeTruthy()

			const row = Number(/cell-(\d+)-\d+$/.exec(active as string)?.[1])

			// A ~180px viewport over ~36px rows pages ~4 rows: more than one, but fewer
			// than the fixed NAV_PAGE_STEP of 10 — so the step was measured, not constant.
			expect(row).toBeGreaterThanOrEqual(2)

			expect(row).toBeLessThan(10)
		})
	})

	/** A navigable window of 200 rows and its scroller. */
	function renderWindow() {
		const view = renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: 36, overscan: 10 }}
					maxHeight="180px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const scroll = view.container.querySelector<HTMLElement>('[data-slot="grid-scroll"]')

		if (!scroll) throw new Error('the scroller')

		return { grid: screen.getByRole('grid'), scroll }
	}

	it('leaves the scroll alone when the active row comes back into the window', async () => {
		const { scroll } = renderWindow()

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		scroll.scrollTop = 1700

		await waitFor(() => expect(screen.queryByText('Name 51')).not.toBeNull())

		fireEvent.mouseDown(screen.getByText('Name 51').closest('td') as HTMLElement)

		await frames()

		scroll.scrollTop = 0

		await waitFor(() => expect(screen.queryByText('Name 51')).toBeNull())

		// Row 51 comes back into the overscan below the viewport. Its active cell
		// mounts again, and the reader's scroll stays where it was put.
		scroll.scrollTop = 1520

		await waitFor(() => expect(screen.queryByText('Name 51')).not.toBeNull())

		await frames()

		expect(scroll.scrollTop).toBe(1520)
	})

	it('seats a mounted cell when focus enters a scrolled window', async () => {
		const { grid, scroll } = renderWindow()

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		scroll.scrollTop = 3000

		await waitFor(() => expect(screen.queryByText('Name 1')).toBeNull())

		grid.focus()

		await waitFor(() => {
			const active = grid.getAttribute('aria-activedescendant')

			expect(active).toBeTruthy()

			expect(document.getElementById(active as string)).not.toBeNull()
		})
	})
})

/**
 * The keyboard cursor over a windowed grouped or master-detail body. The
 * cursor names a row by its item key, and the body scrolls that item into the
 * window before the cursor points at it.
 */
describe('grid virtualized cursor over item bodies (real browser)', () => {
	type Row = { id: number; name: string; team: string; n: number }

	const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		team: `Team ${String(Math.floor(i / 20)).padStart(2, '0')}`,
		n: i,
	}))

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'team', title: 'Team', cell: (row) => row.team, value: (row) => row.team },
		{ id: 'n', title: 'N', cell: (row) => row.n, value: (row) => row.n, aggFunc: 'sum' },
	]

	const getKey = (row: Row) => row.id

	/** Jumps to the last row and waits for the active cell to mount. */
	async function jumpToEnd(grid: HTMLElement): Promise<HTMLElement> {
		grid.focus()

		fireEvent.keyDown(grid, { key: 'End', ctrlKey: true })

		let cell: HTMLElement | null = null

		await waitFor(() => {
			cell = document.getElementById(grid.getAttribute('aria-activedescendant') ?? '')

			expect(cell).not.toBeNull()
		})

		return cell as unknown as HTMLElement
	}

	it('scrolls the last group total into the window', async () => {
		renderUI(
			<div style={{ width: '480px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: 36 }}
					maxHeight="240px"
					columns={columns}
					rows={rows}
					getKey={getKey}
					groupBy={{ value: 'team' }}
					groupTotalRow
				/>
			</div>,
		)

		const grid = screen.getByRole('treegrid')

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		const cell = await jumpToEnd(grid)

		expect(cell.closest('tr')).toHaveAttribute('data-total-row', 'group')

		expect(cell).toHaveAttribute('data-active')

		// One step up lands on the last leaf of the last group.
		fireEvent.keyDown(grid, { key: 'ArrowUp' })

		await waitFor(() => {
			const id = grid.getAttribute('aria-activedescendant') ?? ''

			expect(document.getElementById(id)?.closest('tr')).toHaveTextContent('Name 200')
		})
	})

	it('scrolls the last open detail panel into the window', async () => {
		renderUI(
			<div style={{ width: '480px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: 36 }}
					maxHeight="240px"
					columns={[{ id: 'expand', expander: true }, ...columns]}
					rows={rows}
					getKey={getKey}
					expandable={{
						defaultValue: new Set([200]),
						render: (row) => <p>Detail {row.id}</p>,
					}}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		const cell = await jumpToEnd(grid)

		expect(cell.closest('tr')).toHaveAttribute('data-detail-row', '200')

		expect(cell).toHaveTextContent('Detail 200')
	})
})

/**
 * PageDown over a windowed master-detail body whose panels hold a nested grid.
 * The page step reads the height of a row of the outer grid. A row of a nested
 * grid can have a different height, so the step must not read it.
 */
describe('grid virtualized page step past a nested grid (real browser)', () => {
	type Row = { id: number; name: string }

	type Task = { id: number; title: string }

	const rows: Row[] = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	const columns: GridColumn<Row>[] = [
		{ id: 'expand', expander: true },
		{ id: 'name', title: 'Name', cell: (row) => row.name },
	]

	// The one row of each nested grid is much taller than a row of the outer grid.
	const taskColumns: GridColumn<Task>[] = [
		{ id: 'title', title: 'Title', cell: (t) => <div style={{ height: 120 }}>{t.title}</div> },
	]

	/** The place of `cell` in the cursor order: a data row, then its open panel. */
	const cursorRowOf = (cell: Element): number => {
		const row = cell.closest('tr')

		const panel = row?.getAttribute('data-detail-row')

		if (panel) return (Number(panel) - 1) * 2 + 1

		return (Number(row?.getAttribute('data-grid-row')) - 1) * 2
	}

	it('pages PageDown by the height of an outer row when a panel starts the window', async () => {
		const view = renderUI(
			<div style={{ width: '480px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: 36, overscan: 0 }}
					maxHeight="300px"
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					expandable={{
						defaultValue: new Set(rows.map((row) => row.id)),
						render: (row) => (
							<Grid
								columns={taskColumns}
								rows={[{ id: 1, title: `Task of ${row.name}` }]}
								getKey={(t) => t.id}
							/>
						),
					}}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const scroll = present(
			view.container.querySelector<HTMLElement>('[data-slot="grid-scroll"]'),
			'the scroller',
		)

		await waitFor(() => expect(screen.queryByText('Task of Name 1')).not.toBeNull())

		// Focus seats the cursor on the first cell of the first row.
		grid.focus()

		await waitFor(() => expect(grid.getAttribute('aria-activedescendant')).toBeTruthy())

		const outerRow = present(
			grid.querySelector<HTMLElement>(':scope > tbody > tr[data-grid-row]'),
			'the first outer row',
		)

		const step = Math.max(1, Math.floor(scroll.clientHeight / outerRow.offsetHeight) - 1)

		// The top of the viewport goes into the panel of the first row. With no
		// overscan, that panel is the first item of the window.
		scroll.scrollTop =
			outerRow.getBoundingClientRect().bottom - scroll.getBoundingClientRect().top + 20

		await waitFor(() =>
			expect(
				grid.querySelector(':scope > tbody > tr:is([data-grid-row], [data-detail-row])'),
			).toHaveAttribute('data-detail-row', '1'),
		)

		fireEvent.keyDown(grid, { key: 'PageDown' })

		await waitFor(() => {
			const cell = present(
				document.getElementById(grid.getAttribute('aria-activedescendant') ?? ''),
				'the active cell',
			)

			expect(cursorRowOf(cell)).toBe(step)
		})
	})
})
