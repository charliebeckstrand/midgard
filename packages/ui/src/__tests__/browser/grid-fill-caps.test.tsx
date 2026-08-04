import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * `maxHeight="fill"` caps the grid at its parent's box rather than stretching to
 * it, so a grid with few rows stays as short as its rows and its footer sits
 * directly under them. Only real layout can tell the two apart — jsdom computes
 * no heights, so the boundary suite can assert the classes and nothing more.
 *
 * The many-rows half of the contract (the cap still binds, so windowing and
 * infinite scroll keep working) is covered by `grid-infinite-scroll` and
 * `grid-virtualize-async-rows`, both of which render under `fill`.
 */
describe('grid maxHeight="fill" caps rather than stretches (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	const getKey = (row: Row) => row.id

	const rows = (count: number): Row[] =>
		Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `Name ${index + 1}` }))

	/** The parent box every case caps against — tall enough that 3 rows can't fill it. */
	const PARENT_HEIGHT = 400

	// Virtualized, as the consumers that pass `fill` are: it is the combination
	// that needs the cap to bind, and the one a short row set has to stay short in.
	function render(count: number) {
		return renderUI(
			<div style={{ width: '320px', height: `${PARENT_HEIGHT}px` }}>
				<Grid
					columns={columns}
					rows={rows(count)}
					getKey={getKey}
					virtualize={{ estimateSize: 36 }}
					maxHeight="fill"
					footer={{ rowTotal: true }}
				/>
			</div>,
		)
	}

	it('stays as short as its rows when they do not fill the parent', async () => {
		const { container } = render(3)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		const grid = container.querySelector('[data-slot="grid"]') as HTMLElement

		// The whole point: shorter than the box it caps against, not equal to it.
		expect(grid.getBoundingClientRect().height).toBeLessThan(PARENT_HEIGHT)
	})

	it('puts the footer directly under the last row rather than at the box bottom', async () => {
		const { container } = render(3)

		await waitFor(() => expect(screen.queryByText('Name 3')).not.toBeNull())

		const lastRow = screen.getByText('Name 3').closest('tr') as HTMLElement
		const footer = container.querySelector('[data-slot="grid-footer"]') as HTMLElement

		const gap = footer.getBoundingClientRect().top - lastRow.getBoundingClientRect().bottom

		// A small gap is the wrapper's own row spacing; stranded at the bottom of a
		// 400px box it would be hundreds of pixels.
		expect(gap).toBeLessThan(24)
	})

	it('caps at the parent once the rows would overflow it', async () => {
		const { container } = render(60)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		const grid = container.querySelector('[data-slot="grid"]') as HTMLElement
		const scroll = container.querySelector('[data-slot="grid-scroll"]') as HTMLElement

		// Capped, not grown — and the scroll region actually overflows, which is what
		// keeps a virtualized grid's window (and infinite scroll) bound.
		expect(grid.getBoundingClientRect().height).toBeLessThanOrEqual(PARENT_HEIGHT)

		expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight)
	})
})
