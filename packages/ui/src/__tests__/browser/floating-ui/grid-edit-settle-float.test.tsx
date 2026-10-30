import type { CSSProperties } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { LocaleProvider } from '../../../providers/locale'
import { fireEvent, present, renderUI, screen, waitFor } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'
import { gridCell } from '../../helpers/grid-cells'

/**
 * The settle pair and the error message of a cell-scoped session float below
 * the cell on the real floating engine. The scroll area of the grid does not
 * clip them, so the pair of the last row shows below the grid and takes the
 * pointer. At the bottom of the viewport, the column flips above the cell. In
 * a right-to-left grid, the pair is at the left edge of the cell. Each grid is
 * narrower than the viewport, because the engine keeps the column 8px inside
 * each edge of the viewport.
 */
beforeAll(() => page.viewport(1280, 900))

describe('grid settle pair on the floating engine (real browser)', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bruno' },
	]

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			field: 'name',
			width: '240px',
			cell: (row) => row.name,
			validate: (value) => (value === 'bad' ? 'Enter a valid name' : null),
		},
	]

	/** A box in the middle of the viewport, so no edge of the viewport moves the column. */
	const BOX = { width: 600, marginInline: 'auto' }

	/**
	 * Renders the grid under a cell-scoped session, in a box with `style`.
	 *
	 * @param options - The commit handler, the style of the box, and the direction of a locale
	 * scope around it.
	 * @returns The render result.
	 */
	function renderGrid({
		onCommit = () => {},
		style = BOX,
		dir,
	}: {
		onCommit?: () => void
		style?: CSSProperties
		dir?: 'rtl'
	} = {}) {
		const grid = (
			<div style={style}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ session: 'managed', scope: 'cell', onCommit }}
				/>
			</div>
		)

		return renderUI(dir ? <LocaleProvider dir={dir}>{grid}</LocaleProvider> : grid)
	}

	/** Opens the editor of the name cell of the last row. */
	async function openLastCell(container: HTMLElement) {
		const cell = gridCell(container, 'name', rows.length - 1)

		await userEvent.dblClick(cell)

		const input = await waitFor(() =>
			present<HTMLInputElement>(cell.querySelector('input'), 'the edit input'),
		)

		const save = await screen.findByRole('button', { name: 'Save Name, row 3' })

		const pair = present(save.parentElement, 'the settle pair')

		return { cell, input, save, pair }
	}

	it('shows the pair of the last row below the grid, and the pair takes the pointer', async () => {
		const onCommit = vi.fn()

		const { container } = renderGrid({ onCommit })

		const { cell, input, save, pair } = await openLastCell(container)

		await waitFor(() =>
			expect(pair.getBoundingClientRect().top).toBeNear(cell.getBoundingClientRect().bottom, PIXEL),
		)

		expect(pair.getBoundingClientRect().right).toBeNear(cell.getBoundingClientRect().right, PIXEL)

		// The pair is past the bottom of the grid's scroll area, and nothing clips it.
		const scroller = present(cell.closest<HTMLElement>('table')?.parentElement, 'the scroll area')

		expect(pair.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			scroller.getBoundingClientRect().bottom - PIXEL,
		)

		await userEvent.hover(save)

		const box = save.getBoundingClientRect()

		expect(
			document
				.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
				?.closest('button'),
		).toBe(save)

		await userEvent.clear(input)

		await userEvent.type(input, 'Bea')

		await userEvent.click(save)

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 2, columnId: 'name', value: 'Bea' },
		])
	})

	it('puts the message below the pair, from the start edge of the cell', async () => {
		const { container } = renderGrid()

		const { cell, input, pair } = await openLastCell(container)

		fireEvent.change(input, { target: { value: 'bad' } })

		const message = await screen.findByRole('alert')

		await waitFor(() =>
			expect(message.getBoundingClientRect().left).toBeNear(
				cell.getBoundingClientRect().left,
				PIXEL,
			),
		)

		expect(message.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			pair.getBoundingClientRect().bottom,
		)
	})

	it('flips the column above the cell at the bottom of the viewport', async () => {
		const { container } = renderGrid({ style: { ...BOX, paddingTop: 'calc(100vh - 140px)' } })

		const { cell, pair } = await openLastCell(container)

		// The space below the cell is less than the height of the pair.
		expect(innerHeight - cell.getBoundingClientRect().bottom).toBeLessThan(
			pair.getBoundingClientRect().height,
		)

		await waitFor(() =>
			expect(pair.getBoundingClientRect().bottom).toBeNear(cell.getBoundingClientRect().top, PIXEL),
		)

		expect(pair.getBoundingClientRect().right).toBeNear(cell.getBoundingClientRect().right, PIXEL)
	})

	it('puts the pair at the left edge of a right-to-left cell, and the message at its right edge', async () => {
		const { container } = renderGrid({ dir: 'rtl' })

		const { cell, input, pair } = await openLastCell(container)

		// The inline end of a right-to-left cell is its left edge.
		await waitFor(() =>
			expect(pair.getBoundingClientRect().left).toBeNear(cell.getBoundingClientRect().left, PIXEL),
		)

		expect(pair.getBoundingClientRect().top).toBeNear(cell.getBoundingClientRect().bottom, PIXEL)

		fireEvent.change(input, { target: { value: 'bad' } })

		const message = await screen.findByRole('alert')

		await waitFor(() =>
			expect(message.getBoundingClientRect().right).toBeNear(
				cell.getBoundingClientRect().right,
				PIXEL,
			),
		)
	})
})
