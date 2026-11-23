import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridProps } from '../../modules/grid'
import { fireEvent, frames, getSlot, present, renderUI, screen, waitFor } from '../helpers'

/**
 * The rows that a windowed body keeps mounted out of view (real browser; jsdom
 * renders zero windowed rows). A scroll by the wheel or the scrollbar moves the
 * window and not the cursor. The row of the cursor stays in the document, so
 * `aria-activedescendant` names a mounted cell (WCAG 4.1.2). The row that holds
 * focus stays too, so an open editor keeps focus (WCAG 2.4.3). Each kept row
 * renders at its true position, with its `aria-rowindex`.
 */
describe('grid windowed body keeps the cursor row and the focused row (real browser)', () => {
	type Row = { id: number; name: string; team: string }

	const rows: Row[] = Array.from({ length: 200 }, (_, index) => ({
		id: index + 1,
		name: `Name ${index + 1}`,
		team: `Team ${String(Math.floor(index / 20)).padStart(2, '0')}`,
	}))

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'team', title: 'Team', cell: (row) => row.team, value: (row) => row.team },
	]

	/**
	 * The height of a row. The flat body assumes it for each row, so a row lands
	 * at its true position only when the guess is exact.
	 */
	const ROW = 40

	/** The three windowed bodies: flat, client-grouped, and master-detail. */
	const bodies: { name: string; props: Partial<GridProps<Row>> }[] = [
		{ name: 'flat', props: {} },
		{ name: 'grouped', props: { groupBy: { value: 'team' } } },
		{
			name: 'master-detail',
			props: {
				expandable: { value: new Set(), onValueChange: () => {}, render: (row) => row.name },
			},
		},
	]

	/** Renders a window of 200 rows and waits for the first row. */
	async function renderWindow(grid: ReactNode) {
		const view = renderUI(<div style={{ width: '420px' }}>{grid}</div>)

		const scroll = getSlot(view.container, 'grid-scroll')

		await waitFor(() => expect(screen.queryByText('Name 2')).not.toBeNull())

		return { scroll }
	}

	/** The id that `aria-activedescendant` of the grid names. It throws while there is none. */
	const readActiveId = (grid: HTMLElement): string => {
		const id = grid.getAttribute('aria-activedescendant')

		if (!id) throw new Error('expected an active descendant')

		return id
	}

	/** The distance of a row from the top of its table. */
	const rowTop = (row: Element) =>
		row.getBoundingClientRect().top -
		present(row.closest('table'), 'table').getBoundingClientRect().top

	/** Scrolls the window far from row 2 and waits until row 3 leaves it. */
	async function scrollAway(scroll: HTMLElement, top: number) {
		scroll.scrollTop = top

		await waitFor(() => expect(screen.queryByText('Name 3')).toBeNull())

		await frames()
	}

	for (const { name, props } of bodies) {
		it(`keeps the cursor row of a ${name} window mounted when a scroll moves it out`, async () => {
			const { scroll } = await renderWindow(
				<Grid<Row>
					navigable
					virtualize={{ estimateSize: ROW, overscan: 2 }}
					maxHeight="180px"
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					{...props}
				/>,
			)

			const grid = screen.getByRole(name === 'grouped' ? 'treegrid' : 'grid')

			fireEvent.mouseDown(present(screen.getByText('Name 2').closest('td'), 'cell'))

			const id = await waitFor(() => readActiveId(grid))

			const row = present(document.getElementById(id)?.closest('tr'), 'row')

			const rowIndex = row.getAttribute('aria-rowindex')

			const top = rowTop(row)

			await scrollAway(scroll, 3000)

			expect(grid.getAttribute('aria-activedescendant')).toBe(id)

			const kept = present(document.getElementById(id)?.closest('tr'), 'kept row')

			expect(kept).toBe(row)

			expect(kept.getAttribute('aria-rowindex')).toBe(rowIndex)

			// The row stays at its true position: the spacers around it hold the rows
			// that the window does not render.
			expect(rowTop(kept)).toBeCloseTo(top, 0)

			expect(scroll.scrollTop).toBeGreaterThan(2000)
		})

		it(`keeps an open editor of a ${name} window focused when a scroll moves it out`, async () => {
			// A run of many files can leave the page without window focus.
			vi.spyOn(document, 'hasFocus').mockReturnValue(true)

			const { scroll } = await renderWindow(
				<Grid<Row>
					virtualize={{ estimateSize: ROW, overscan: 2 }}
					maxHeight="180px"
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ rows: new Set([2]), onRowsChange: () => {}, onCommit: () => {} }}
					{...props}
				/>,
			)

			const editor = await waitFor(() =>
				present(screen.queryByRole('textbox', { name: /row \d+$/ }), 'editor'),
			)

			editor.focus()

			expect(document.activeElement).toBe(editor)

			await frames()

			await scrollAway(scroll, 3000)

			expect(editor.isConnected).toBe(true)

			expect(document.activeElement).toBe(editor)
		})
	}

	// A grid with no cursor has no row of the cursor. The row that holds focus
	// stays mounted on its own.
	it('keeps the focused row of a window with no cursor mounted', async () => {
		vi.spyOn(document, 'hasFocus').mockReturnValue(true)

		const { scroll } = await renderWindow(
			<Grid<Row>
				virtualize={{ estimateSize: ROW, overscan: 2 }}
				maxHeight="180px"
				columns={[
					...columns,
					{ id: 'actions', actions: (row) => <button type="button">Open {row.name}</button> },
				]}
				rows={rows}
				getKey={(row) => row.id}
			/>,
		)

		expect(screen.getByRole('table')).not.toHaveAttribute('aria-activedescendant')

		const button = screen.getByRole('button', { name: 'Open Name 2' })

		button.focus()

		await scrollAway(scroll, 3000)

		expect(button.isConnected).toBe(true)

		expect(document.activeElement).toBe(button)

		// Focus that leaves the body releases the row.
		button.blur()

		await waitFor(() => expect(button.isConnected).toBe(false))
	})

	it('keeps a cursor row below the window at its true position', async () => {
		const { scroll } = await renderWindow(
			<Grid<Row>
				navigable
				virtualize={{ estimateSize: ROW, overscan: 2 }}
				maxHeight="180px"
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
			/>,
		)

		scroll.scrollTop = 3000

		await waitFor(() => expect(screen.queryByText('Name 78')).not.toBeNull())

		const grid = screen.getByRole('grid')

		fireEvent.mouseDown(present(screen.getByText('Name 78').closest('td'), 'cell'))

		const id = await waitFor(() => readActiveId(grid))

		const row = present(document.getElementById(id)?.closest('tr'), 'row')

		const top = rowTop(row)

		scroll.scrollTop = 0

		await waitFor(() => expect(screen.queryByText('Name 77')).toBeNull())

		await frames()

		expect(document.getElementById(id)?.closest('tr')).toBe(row)

		expect(row.getAttribute('aria-rowindex')).toBe('79')

		expect(rowTop(row)).toBeCloseTo(top, 0)

		// The scroll height stays that of the full list.
		expect(scroll.scrollHeight).toBeGreaterThan(ROW * 199)
	})
})
