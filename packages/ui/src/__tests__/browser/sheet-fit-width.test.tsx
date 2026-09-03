import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Sheet, SheetBody } from '../../components/sheet'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, frames, present, renderUI } from '../helpers'

/**
 * Real-browser check of the `fit` sheet around a `fit` grid. Both halves are
 * measurements — the grid states the width its columns come to, and the panel is
 * built around it — and jsdom lays nothing out, so this is the only place the
 * pair can be seen agreeing.
 *
 * The failure it guards is not a wrong number but an unstable one: a `fill` grid
 * inside a shrink-wrapping panel measures the panel while the panel measures it,
 * and the two settle somewhere new on every render.
 */

type Row = { id: string; name: string }

const ROWS: Row[] = Array.from({ length: 8 }, (_, at) => ({ id: `r-${at}`, name: `Row ${at}` }))

/** `count` columns, all reading the same short field, so their width is the headers'. */
function columnsOf(count: number): GridColumn<Row>[] {
	return Array.from({ length: count }, (_, at) => ({
		id: `c-${at}`,
		title: `Column ${at}`,
		value: (row: Row) => row.name,
		cell: (row: Row) => row.name,
	}))
}

/**
 * Opens a fitted sheet around a fitted grid and hands back the panel, the table,
 * and the wrapper that would scroll it sideways — `data-slot="table"`, the
 * `overflow-x-auto` box the table sits in.
 */
async function openSheet(columns: GridColumn<Row>[], label: string) {
	renderUI(
		<Sheet open onOpenChange={() => {}} width="fit" aria-label={label}>
			<SheetBody>
				<Grid<Row> columns={columns} rows={ROWS} getKey={(row) => row.id} width="fit" />
			</SheetBody>
		</Sheet>,
	)

	await frames()

	const panel = present(bySlot(document.body, 'sheet'), 'sheet panel')

	return {
		panel,
		scroll: present(bySlot(panel, 'table'), 'table scroll region'),
		table: present(panel.querySelector<HTMLElement>('table'), 'grid table'),
	}
}

describe('fit sheet width (real browser)', () => {
	// A `fit` panel is a decision above the `sm` breakpoint; below it a sheet is
	// flush and full-width, because there is no room on a phone for a panel to be
	// narrower than the screen. The suite's own frame is narrower than that, so
	// the case has to state the screen it is about.
	beforeAll(() => page.viewport(1100, 800))

	it('wraps the grid, and leaves it nothing to scroll sideways', async () => {
		const { panel, scroll, table } = await openSheet(columnsOf(2), 'Index')

		// Sized by the table rather than by the screen: the panel clears its content
		// and stops well short of the room it could have taken.
		expect(panel.getBoundingClientRect().width).toBeGreaterThan(table.getBoundingClientRect().width)

		expect(panel.getBoundingClientRect().width).toBeLessThan(window.innerWidth * 0.9)

		// Which is the point of the pair: the columns fit, so nothing scrolls.
		expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth + 1)
	})

	it('stops at the screen less its own inset when the columns cannot fit', async () => {
		// Enough columns that their content cannot fit the screen, so the panel meets
		// its cap and the grid takes the overflow.
		const { panel, scroll } = await openSheet(columnsOf(24), 'Wide')

		const box = panel.getBoundingClientRect()

		// The inset it floats on, kept on both sides rather than running the far edge
		// off the other side of the screen.
		expect(box.left).toBeGreaterThan(0)

		expect(box.width).toBeLessThanOrEqual(window.innerWidth - box.left * 2 + 1)

		// The columns genuinely do not fit, so the grid scrolls. That is the honest
		// outcome at this width, not a defect.
		expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth)
	})
})
