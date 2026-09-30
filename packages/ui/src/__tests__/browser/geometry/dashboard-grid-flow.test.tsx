import { describe, expect, it } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { Grid, type GridColumn, type GridPagination } from '../../../modules/grid'
import { renderUI, screen } from '../../helpers'

/**
 * In the re-pack of a narrow board, a grid that fills its tile shows pages of
 * 10 rows, and the tile grows to hold them. The page then has no scroll region
 * inside a scroll region. A real engine lays out the rows, so the case runs in
 * a real browser.
 */
describe('dashboard grid tile on a narrow board (real browser)', () => {
	type Row = { id: number; name: string }

	const COLUMNS: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const ROWS: Row[] = Array.from({ length: 25 }, (_, index) => ({
		id: index + 1,
		name: `Row ${index + 1}`,
	}))

	// At 360 px, a column is 15 px, so the list starves at 12 columns.
	const LAYOUT: DashboardLayoutItem[] = [{ id: 'list', x: 0, y: 0, w: 12, h: 20 }]

	function Board({ width, pagination }: { width: number; pagination?: GridPagination | false }) {
		return (
			<div style={{ width }}>
				<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
					<DashboardTile id="list" title="Orders" minWidth={240}>
						<Grid
							columns={COLUMNS}
							rows={ROWS}
							getKey={(row) => row.id}
							header={{ position: 'sticky' }}
							maxHeight="fill"
							pagination={pagination}
						/>
					</DashboardTile>
				</Dashboard>
			</div>
		)
	}

	/** The content box of the tile, and the rows that its grid renders. */
	function parts() {
		const tile = screen.getByRole('group', { name: 'Orders' })

		const content = tile.querySelector<HTMLElement>('[data-slot="dashboard-tile-content"]')

		if (content === null) throw new Error('The tile has no content box.')

		return { tile, content, rows: tile.querySelectorAll('tbody tr').length }
	}

	/** Waits for the frames in which the board measures the content and re-packs. */
	async function settle() {
		for (let frame = 0; frame < 6; frame++) await new Promise(requestAnimationFrame)
	}

	it('shows 10 rows in the flow of the page, and the tile holds them', async () => {
		renderUI(<Board width={360} />)

		await settle()

		const { tile, content, rows } = parts()

		expect(rows).toBe(10)

		expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()

		// The tile grows past its shape, so the content box has nothing to scroll.
		expect(content.scrollHeight).toBeLessThanOrEqual(content.clientHeight + 1)

		const bottom = content.getBoundingClientRect().bottom

		expect(bottom).toBeLessThanOrEqual(tile.getBoundingClientRect().bottom + 1)
	})

	it('keeps the rows in the scroll region of the tile under pagination={false}', async () => {
		renderUI(<Board width={360} pagination={false} />)

		await settle()

		const { tile, rows } = parts()

		expect(rows).toBe(25)

		// The grid fills the tile and scrolls its rows in a region of its own.
		const scrolls = [...tile.querySelectorAll<HTMLElement>('*')].some(
			(node) =>
				node.scrollHeight > node.clientHeight + 1 && getComputedStyle(node).overflowY !== 'visible',
		)

		expect(scrolls).toBe(true)
	})

	it('keeps the rows in the scroll region of the tile on the saved layout', async () => {
		renderUI(<Board width={960} />)

		await settle()

		expect(parts().rows).toBe(25)

		expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
	})
})
