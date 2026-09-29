import { describe, expect, it } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { renderUI, screen } from '../helpers'

/**
 * A narrow tile gives its chart the spark tier, and a real engine measures the
 * chart. The header row of the tile stays in the flow at that tier, so the tile
 * always shows its title.
 */
describe('dashboard spark tile (real browser)', () => {
	const DATA = [3, 8, 5, 9, 4, 7].map((value, index) => ({ label: `d${index}`, value }))

	// At 960 px, a column is 40 px. The narrow tile gives its chart under 160 px.
	const LAYOUT: DashboardLayoutItem[] = [
		{ id: 'spark', x: 0, y: 0, w: 3, h: 12 },
		{ id: 'wide', x: 3, y: 0, w: 12, h: 12 },
	]

	function Board({ editing = false }: { editing?: boolean }) {
		return (
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Board" editing={editing} layout={{ value: LAYOUT }}>
					{LAYOUT.map(({ id }) => (
						<DashboardTile key={id} id={id} title={`Trend ${id}`} minWidth={0} expandable>
							<LineChart
								aria-label={`Chart ${id}`}
								data={DATA}
								series={[{ xKey: 'label', yKey: 'value', yName: 'Value' }]}
								aspectRatio={false}
							/>
						</DashboardTile>
					))}
				</Dashboard>
			</div>
		)
	}

	/** The tile of `id`, its header row, and its content box. */
	function parts(id: string) {
		const tile = screen.getByRole('group', { name: `Trend ${id}` })

		return {
			tile,
			header: tile.querySelector<HTMLElement>(':scope > [data-slot="card-header"]'),
			content: tile.querySelector<HTMLElement>('[data-slot="dashboard-tile-content"]'),
		}
	}

	const tierOf = (id: string) =>
		parts(id).tile.querySelector('[data-tier]')?.getAttribute('data-tier')

	const style = (element: HTMLElement | null) => getComputedStyle(element as HTMLElement)

	it('keeps the header of a spark tile in the flow and in view', async () => {
		renderUI(<Board />)

		await expect.poll(() => tierOf('spark')).toBe('spark')

		const { header, content } = parts('spark')

		expect(style(header).position).toBe('static')

		expect(style(header).opacity).toBe('1')

		expect(parts('spark').tile).toHaveTextContent('Trend spark')

		// The content box starts under the header row.
		expect(content?.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			header?.getBoundingClientRect().bottom ?? 0,
		)
	})

	it('keeps one content height when edit mode switches', async () => {
		const { rerender } = renderUI(<Board />)

		await expect.poll(() => tierOf('spark')).toBe('spark')

		const rest = parts('spark').content?.getBoundingClientRect().height

		rerender(<Board editing />)

		expect(screen.getByRole('button', { name: 'Move Trend spark' })).toBeVisible()

		expect(style(parts('spark').header).position).toBe('static')

		expect(parts('spark').content?.getBoundingClientRect().height).toBe(rest)
	})
})
