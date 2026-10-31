import { beforeAll, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Grid, type GridColumn, type GridProps } from '../../../modules/grid'
import { LocaleProvider } from '../../../providers/locale'
import { present, renderUI, waitFor } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'
import { gridCell } from '../../helpers/grid-cells'

/**
 * The focused text editor of a narrow cell grows past the cell as the user
 * types, on the real floating engine. It covers the cell from its start edge,
 * so the text stays where it was, and it grows toward the inline end. At the
 * end edge of the scroll area it moves toward the start. It paints above the
 * pinned cells and under the sticky head, and it stays on its cell through a
 * scroll, in a virtualized grid and in a nested grid.
 */
beforeAll(() => page.viewport(1280, 900))

type Row = { id: number; name: string; email: string; role: string }

const rows: Row[] = Array.from({ length: 30 }, (_, index) => ({
	id: index + 1,
	name: `Person ${index + 1}`,
	email: `p${index + 1}@ex.co`,
	role: 'Developer',
}))

/** The text that the tests type: wider than each cell, narrower than 28rem. */
const LONG = '.with-a-much-longer-domain'

const columns = (extra: Partial<Record<keyof Row, Partial<GridColumn<Row>>>> = {}) =>
	(['name', 'email', 'role'] as const).map(
		(field): GridColumn<Row> => ({
			id: field,
			title: field,
			field,
			width: '160px',
			cell: (row) => row[field],
			...extra[field],
		}),
	)

const getSlot = (cell: HTMLElement) =>
	present<HTMLElement>(cell.querySelector('[data-slot="grid-edit-slot"]'), 'the editor slot')

/** Opens the editor of `cell` under a cell-scoped session, and types `text` at its end. */
const openAndType = vi.defineHelper(async (cell: HTMLElement, text: string) => {
	await userEvent.dblClick(cell)

	const input = await waitFor(() =>
		present<HTMLInputElement>(cell.querySelector('input'), 'the edit input'),
	)

	await waitFor(() => expect(document.activeElement).toBe(input))

	await userEvent.keyboard(`{End}${text}`)

	const slot = getSlot(cell)

	await waitFor(() => expect(slot.hasAttribute('data-grown')).toBe(true))

	return { input, slot }
})

const cellScope = { session: 'managed', scope: 'cell', onCommit: () => {} } as const

/**
 * Renders the grid in a box of `width`, with a cell-scoped session unless `props` sets another.
 *
 * @param props - The props that replace the defaults of the grid.
 * @param options - The width of the box, and the direction of a locale scope around it.
 * @returns The render result.
 */
function renderGrid(
	props: Partial<GridProps<Row>> = {},
	{ width = 900, dir }: { width?: number; dir?: 'rtl' } = {},
) {
	const grid = (
		<div style={{ width, marginInline: dir ? 'auto' : undefined }}>
			<Grid
				columns={columns()}
				rows={rows}
				getKey={(row) => row.id}
				editable={cellScope}
				{...props}
			/>
		</div>
	)

	return renderUI(dir ? <LocaleProvider dir={dir}>{grid}</LocaleProvider> : grid)
}

describe('grid editor grow (real floating engine)', () => {
	it('grows toward the inline end as the user types, and keeps the place of the text', async () => {
		const { container } = renderGrid()

		const cell = gridCell(container, 'email')

		const rowHeight = present(cell.closest('tr'), 'the row').getBoundingClientRect().height

		await userEvent.dblClick(cell)

		const input = await waitFor(() =>
			present<HTMLInputElement>(cell.querySelector('input'), 'the edit input'),
		)

		// The value fits, so the editor stays in the cell.
		expect(getSlot(cell).hasAttribute('data-grown')).toBe(false)

		const textStart = input.getBoundingClientRect().left

		await userEvent.keyboard(`{End}${LONG}`)

		const slot = getSlot(cell)

		await waitFor(() => expect(slot.getBoundingClientRect().width).toBeGreaterThan(300))

		const box = slot.getBoundingClientRect()

		const cellBox = cell.getBoundingClientRect()

		expect(box.left).toBeNear(cellBox.left, PIXEL)

		expect(box.top).toBeNear(cellBox.top, PIXEL)

		expect(box.height).toBeNear(cellBox.height, PIXEL)

		expect(input.getBoundingClientRect().left).toBeNear(textStart, PIXEL)

		// The input shows the whole value, so it does not scroll.
		expect(input.scrollWidth).toBeLessThanOrEqual(input.clientWidth)

		expect(present(cell.closest('tr'), 'the row').getBoundingClientRect().height).toBeNear(
			rowHeight,
			PIXEL,
		)
	})

	it('caps the width at 28rem', async () => {
		const { container } = renderGrid()

		const { slot } = await openAndType(gridCell(container, 'email'), LONG.repeat(4))

		await waitFor(() => expect(slot.getBoundingClientRect().width).toBeNear(28 * 16, PIXEL))
	})

	it('goes back into the cell as focus leaves the editor', async () => {
		const { container } = renderGrid({ editable: { rows: new Set([1]), onCommit: () => {} } })

		const email = gridCell(container, 'email')

		await userEvent.click(present(email.querySelector('input'), 'the email editor'))

		await userEvent.keyboard(`{End}${LONG}`)

		const slot = getSlot(email)

		await waitFor(() => expect(slot.hasAttribute('data-grown')).toBe(true))

		await userEvent.click(present(gridCell(container, 'name').querySelector('input'), 'name'))

		await waitFor(() => expect(slot.hasAttribute('data-grown')).toBe(false))

		expect(slot.style.width).toBe('')

		expect(slot.getBoundingClientRect().right).toBeLessThanOrEqual(
			email.getBoundingClientRect().right + PIXEL,
		)
	})

	it('moves toward the start at the end edge of the scroll area', async () => {
		const { container } = renderGrid({}, { width: 600 })

		const cell = gridCell(container, 'role')

		const { slot } = await openAndType(cell, LONG)

		const scroller = present(cell.closest('table')?.parentElement, 'the scroll area')

		await waitFor(() =>
			expect(slot.getBoundingClientRect().left).toBeLessThan(cell.getBoundingClientRect().left),
		)

		expect(slot.getBoundingClientRect().right).toBeLessThanOrEqual(
			scroller.getBoundingClientRect().right + PIXEL,
		)
	})

	it('grows toward the left in a right-to-left grid', async () => {
		const { container } = renderGrid({}, { dir: 'rtl' })

		const cell = gridCell(container, 'email')

		const { slot } = await openAndType(cell, LONG)

		await waitFor(() =>
			expect(slot.getBoundingClientRect().right).toBeNear(
				cell.getBoundingClientRect().right,
				PIXEL,
			),
		)

		expect(slot.getBoundingClientRect().left).toBeLessThan(cell.getBoundingClientRect().left)
	})

	it('paints above a pinned cell', async () => {
		const { container } = renderGrid({ columns: columns({ role: { pinned: 'right' } }) })

		const cell = gridCell(container, 'email')

		const { slot } = await openAndType(cell, LONG.repeat(2))

		const pinned = gridCell(container, 'role')

		const pinnedBox = pinned.getBoundingClientRect()

		await waitFor(() =>
			expect(slot.getBoundingClientRect().right).toBeGreaterThan(pinnedBox.left + 20),
		)

		const hit = document.elementFromPoint(pinnedBox.left + 10, pinnedBox.top + pinnedBox.height / 2)

		expect(slot.contains(hit)).toBe(true)
	})

	it('paints under the sticky head, and stays on its cell through a scroll', async () => {
		const { container } = renderGrid({ header: { position: 'sticky' }, maxHeight: '240px' })

		const cell = gridCell(container, 'email', 2)

		const { slot } = await openAndType(cell, LONG)

		const scroller = present(cell.closest('table')?.parentElement, 'the scroll area')

		const head = present(container.querySelector<HTMLElement>('thead th'), 'a head cell')

		// The row of the editor goes under the head.
		scroller.scrollTop = cell.getBoundingClientRect().top - head.getBoundingClientRect().top - 10

		await waitFor(() =>
			expect(slot.getBoundingClientRect().top).toBeNear(cell.getBoundingClientRect().top, PIXEL),
		)

		const headBox = head.getBoundingClientRect()

		const x = cell.getBoundingClientRect().left + 20

		expect(document.elementFromPoint(x, headBox.bottom - 2)?.closest('thead')).not.toBeNull()
	})

	it('stays on its cell through a scroll of a virtualized grid', async () => {
		const { container } = renderGrid({ virtualize: { estimateSize: 46 }, maxHeight: '300px' })

		const cell = gridCell(container, 'email', 3)

		const { slot } = await openAndType(cell, LONG)

		const scroller = present(cell.closest('table')?.parentElement, 'the scroll area')

		scroller.scrollTop = 60

		await waitFor(() =>
			expect(slot.getBoundingClientRect().top).toBeNear(cell.getBoundingClientRect().top, PIXEL),
		)

		expect(slot.getBoundingClientRect().left).toBeNear(cell.getBoundingClientRect().left, PIXEL)
	})

	it('grows the editor of a nested grid over its own cell', async () => {
		type Outer = { id: number; team: string }

		const { container } = renderUI(
			<div style={{ width: 900 }}>
				<Grid<Outer>
					columns={[
						{ id: 'expand', expander: true },
						{ id: 'team', title: 'Team', cell: (row) => row.team },
					]}
					rows={[{ id: 1, team: 'Core' }]}
					getKey={(row) => row.id}
					expandable={{
						defaultValue: new Set([1]),
						render: () => (
							<Grid
								columns={columns()}
								rows={rows.slice(0, 2)}
								getKey={(row) => row.id}
								editable={cellScope}
							/>
						),
					}}
				/>
			</div>,
		)

		const cell = gridCell(container, 'email')

		const { slot } = await openAndType(cell, LONG)

		await waitFor(() =>
			expect(slot.getBoundingClientRect().width).toBeGreaterThan(
				cell.getBoundingClientRect().width,
			),
		)

		expect(slot.getBoundingClientRect().left).toBeNear(cell.getBoundingClientRect().left, PIXEL)

		expect(slot.getBoundingClientRect().top).toBeNear(cell.getBoundingClientRect().top, PIXEL)
	})
})
