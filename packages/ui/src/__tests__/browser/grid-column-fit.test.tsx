import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, waitFor } from '../helpers'

/**
 * Content-aware column auto-sizing against a real layout engine. The autosizer
 * reads the container width and the rendered cells' intrinsic widths, then writes
 * column sizing — none of which jsdom provides (it paints no layout, so
 * `clientWidth` is 0 and the autosizer stands down). Here the grid renders inside
 * a known-width frame, so the resolved widths, header truncation, and overflow
 * can be measured.
 */
describe('grid column auto-sizing (real browser)', () => {
	type Row = { id: number; tiny: string; big: string }

	const tinyRows: Row[] = Array.from({ length: 3 }, (_, i) => ({
		id: i + 1,
		tiny: 'x',
		big: 'A very long cell value that is wider than the whole frame on its own',
	}))

	const getKey = (row: Row) => row.id

	function render(frameWidth: number, columns: GridColumn<Row>[], rows = tinyRows) {
		const { container } = renderUI(
			<div style={{ width: `${frameWidth}px` }}>
				<Grid columns={columns} rows={rows} getKey={getKey} />
			</div>,
		)

		const table = container.querySelector('table') as HTMLElement

		const scroll = container.querySelector<HTMLElement>('[data-slot="table"]') as HTMLElement

		const header = (id: string) =>
			container.querySelector<HTMLElement>(`th[data-grid-col="${id}"]`) as HTMLElement

		const title = (id: string) =>
			header(id).querySelector<HTMLElement>('[data-grid-content]') as HTMLElement

		return { container, table, scroll, header, title }
	}

	it('auto-sizes width-less columns to fill the container', async () => {
		const { table, scroll } = render(600, [
			{ id: 'name', title: 'Name', cell: (row) => row.tiny },
			{ id: 'role', title: 'Role', cell: (row) => row.tiny },
		])

		// Short content with room to spare: the columns grow to fill the frame rather
		// than hugging their content and leaving the table short.
		await waitFor(() => expect(table.getBoundingClientRect().width).toBeGreaterThan(560))

		expect(table.getBoundingClientRect().width).toBeLessThanOrEqual(scroll.clientWidth + 1)
	})

	it('gives columns that fit with room to spare an equal width', async () => {
		const { header } = render(600, [
			{ id: 'name', title: 'Name', cell: (row) => row.tiny },
			{ id: 'role', title: 'Role', cell: (row) => row.tiny },
		])

		// Two equally undemanding columns settle at the same width.
		await waitFor(() => expect(header('name').getBoundingClientRect().width).toBeGreaterThan(250))

		// Equal up to the single leftover pixel the exact-sum rounding hands one column.
		expect(
			Math.abs(
				header('name').getBoundingClientRect().width - header('role').getBoundingClientRect().width,
			),
		).toBeLessThanOrEqual(1)
	})

	it('widens the column whose data would truncate, leaving the others narrower', async () => {
		const rows: Row[] = [
			{ id: 1, tiny: 'x', big: 'A fairly long value that wants more room' },
			{ id: 2, tiny: 'y', big: 'Another long value needing width' },
		]

		const { header } = render(
			640,
			[
				{ id: 'a', title: 'A', cell: (row) => row.tiny },
				{ id: 'wide', title: 'Wide', cell: (row) => row.big },
				{ id: 'b', title: 'B', cell: (row) => row.tiny },
			],
			rows,
		)

		await waitFor(() => expect(header('wide').getBoundingClientRect().width).toBeGreaterThan(0))

		// The data-heavy column claims more width than its undemanding neighbours.
		expect(header('wide').getBoundingClientRect().width).toBeGreaterThan(
			header('a').getBoundingClientRect().width,
		)

		// …which settle equal to each other (up to the single leftover rounding pixel).
		expect(
			Math.abs(
				header('a').getBoundingClientRect().width - header('b').getBoundingClientRect().width,
			),
		).toBeLessThanOrEqual(1)
	})

	it('keeps a single-word header from truncating, even when squeezed', async () => {
		const { title } = render(320, [
			{ id: 'idcol', title: 'Identifier', cell: (row) => row.tiny },
			{ id: 'big', title: 'Name', cell: (row) => row.big },
		])

		// The dominating `big` column forces a deficit, but `Identifier` is one word, so
		// its column floors at the full header width and the title is not clipped.
		await waitFor(() => {
			const leaf = title('idcol')

			expect(leaf.scrollWidth).toBeLessThanOrEqual(leaf.clientWidth + 1)
		})
	})

	it('lets a multi-word header truncate when its column is tight', async () => {
		const { title } = render(320, [
			{ id: 'tscol', title: 'Created at timestamp', cell: (row) => row.tiny },
			{ id: 'big', title: 'Name', cell: (row) => row.big },
		])

		// `Created at timestamp` is multi-word with tiny data, so under the same deficit
		// its column floors at just its affordances and the header clips to an ellipsis.
		await waitFor(() => {
			const leaf = title('tscol')

			expect(leaf.scrollWidth).toBeGreaterThan(leaf.clientWidth + 1)
		})
	})

	it('holds content widths and overflows when they exceed the container', async () => {
		const { table, scroll } = render(240, [
			{ id: 'big', title: 'Name', cell: (row) => row.big },
			{ id: 'big2', title: 'Detail', cell: (row) => row.big },
		])

		// Two wide columns can't fit a 240px frame: they hold at their content widths
		// and the table overflows sideways rather than squishing to truncate.
		await waitFor(() =>
			expect(table.getBoundingClientRect().width).toBeGreaterThan(scroll.clientWidth),
		)
	})

	it('lets a column width supersede the autosizer', async () => {
		const { header } = render(600, [
			{ id: 'fixed', title: 'Fixed', cell: (row) => row.tiny, width: '250px' },
			{ id: 'flex', title: 'Flex', cell: (row) => row.tiny },
		])

		// The `width` column holds exactly 250 (no growth into the surplus); the
		// width-less column absorbs the rest.
		await waitFor(() => expect(header('flex').getBoundingClientRect().width).toBeGreaterThan(250))

		expect(header('fixed').getBoundingClientRect().width).toBeCloseTo(250, 0)
	})

	it('holds a pinned column at its content width, flowing the surplus to the scrolling column', async () => {
		const { header } = render(600, [
			{ id: 'pin', title: 'Pin', cell: (row) => row.tiny, pinned: 'left' },
			{ id: 'flex', title: 'Flex', cell: (row) => row.tiny },
		])

		// Two undemanding columns with room to spare would ordinarily level to one
		// shared width; pinning holds `pin` at its content, so `flex` takes the surplus.
		await waitFor(() => expect(header('flex').getBoundingClientRect().width).toBeGreaterThan(300))

		const pin = header('pin').getBoundingClientRect().width

		const flex = header('flex').getBoundingClientRect().width

		// The frozen rail stays narrow while the scrolling column runs far past an even split.
		expect(flex - pin).toBeGreaterThan(200)
	})

	it('sizes a badge column to the badges’ natural width, not their clipped width', async () => {
		// A composed cell — a flex row of Badge chips — is a block box that fills the
		// clipped leaf, so its in-place rect reads the current column width rather than
		// the width the chips want; only the batched max-content pass can see their
		// natural row. (A lone Badge inherits the leaf's nowrap and measures true even
		// clipped; the wrapper is the case that breaks without the pass.)
		const { container, table, scroll } = render(240, [
			{
				id: 'status',
				title: 'Status',
				cell: () => (
					<div style={{ display: 'flex', gap: '4px' }}>
						<Badge>Verification pending review</Badge>

						<Badge>Escalated to compliance team</Badge>
					</div>
				),
			},
		])

		// The chip row needs more than the 240px frame: the column holds at the row's
		// natural width and the table overflows sideways instead of clipping the chips.
		await waitFor(() =>
			expect(table.getBoundingClientRect().width).toBeGreaterThan(scroll.clientWidth),
		)

		// Nothing in the chip row is cut off by its wrapper…
		const wrap = container.querySelector<HTMLElement>('td [data-grid-content] > div') as HTMLElement

		expect(wrap.scrollWidth).toBeLessThanOrEqual(wrap.clientWidth + 1)

		// …and the row isn't clipped by the cell's truncating leaf either.
		const leaf = container.querySelector<HTMLElement>('td [data-grid-content]') as HTMLElement

		expect(leaf.scrollWidth).toBeLessThanOrEqual(leaf.clientWidth + 1)
	})

	it('"Auto-size all columns" grows a capped column until its content shows whole', async () => {
		const huge = `${tinyRows[0]?.big} and then keeps going well past the automatic runaway-cell cap`

		const rows: Row[] = [{ id: 1, tiny: 'x', big: huge }]

		const { container, header } = render(
			600,
			[
				{ id: 'name', title: 'Name', cell: (row) => row.tiny },
				{ id: 'big', title: 'Detail', cell: (row) => row.big },
			],
			rows,
		)

		const leaf = () =>
			container.querySelector<HTMLElement>(
				'td[data-grid-col="big"] [data-grid-content]',
			) as HTMLElement

		// The automatic fit holds the runaway column at the content cap, truncating it.
		await waitFor(() => expect(leaf().scrollWidth).toBeGreaterThan(leaf().clientWidth + 1))

		fireEvent.contextMenu(header('big'))

		const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
			el.textContent?.includes('Auto-size all columns'),
		)

		if (!item) throw new Error('no Auto-size all columns item')

		fireEvent.click(item)

		// The user-invoked fit lifts the cap: the column grows to the smallest width
		// that shows the content untruncated, overflowing the frame.
		await waitFor(() => expect(leaf().scrollWidth).toBeLessThanOrEqual(leaf().clientWidth + 1))

		expect(header('big').getBoundingClientRect().width).toBeGreaterThan(600)
	})

	it('"Auto-size this column" shrinks a surplus-stretched column to its content', async () => {
		const { header } = render(600, [
			{ id: 'name', title: 'Name', cell: (row) => row.tiny },
			{ id: 'role', title: 'Role', cell: (row) => row.tiny },
		])

		// The surplus levels both undemanding columns to an even split.
		await waitFor(() => expect(header('name').getBoundingClientRect().width).toBeGreaterThan(250))

		fireEvent.contextMenu(header('name'))

		const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
			el.textContent?.includes('Auto-size this column'),
		)

		if (!item) throw new Error('no Auto-size this column item')

		fireEvent.click(item)

		// The reset column drops to the smallest width its header and data need…
		await waitFor(() => expect(header('name').getBoundingClientRect().width).toBeLessThan(150))

		// …while its neighbour holds the width it had instead of re-fitting.
		expect(header('role').getBoundingClientRect().width).toBeGreaterThan(250)
	})

	it('"Auto-size this column" grows a truncated column until its content shows whole', async () => {
		const huge = `${tinyRows[0]?.big} and then keeps going well past the automatic runaway-cell cap`

		const rows: Row[] = [{ id: 1, tiny: 'x', big: huge }]

		const { container, header } = render(
			600,
			[
				{ id: 'name', title: 'Name', cell: (row) => row.tiny },
				{ id: 'big', title: 'Detail', cell: (row) => row.big },
			],
			rows,
		)

		const leaf = () =>
			container.querySelector<HTMLElement>(
				'td[data-grid-col="big"] [data-grid-content]',
			) as HTMLElement

		await waitFor(() => expect(leaf().scrollWidth).toBeGreaterThan(leaf().clientWidth + 1))

		fireEvent.contextMenu(header('big'))

		const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
			el.textContent?.includes('Auto-size this column'),
		)

		if (!item) throw new Error('no Auto-size this column item')

		fireEvent.click(item)

		// The single-column fit measures uncapped: the column lands at the smallest
		// width that shows its content untruncated.
		await waitFor(() => expect(leaf().scrollWidth).toBeLessThanOrEqual(leaf().clientWidth + 1))

		expect(header('big').getBoundingClientRect().width).toBeGreaterThan(600)
	})

	it('fills the container without a phantom scrollbar under outline borders', async () => {
		const { container } = renderUI(
			<div style={{ width: '600px' }}>
				<Grid
					outline
					columns={[
						{ id: 'name', title: 'Name', cell: (row) => row.tiny },
						{ id: 'role', title: 'Role', cell: (row) => row.tiny },
					]}
					rows={tinyRows}
					getKey={getKey}
				/>
			</div>,
		)

		const table = container.querySelector('table') as HTMLElement

		const scroll = container.querySelector<HTMLElement>('[data-slot="table"]') as HTMLElement

		await waitFor(() => expect(table.style.width).not.toBe(''))

		// The bordered table lands on the container exactly — no horizontal scrollbar.
		expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth)
	})
})
