import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { LineChart } from '../../modules/chart/line-chart'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { renderUI, screen } from '../helpers'

/**
 * The spark veil is a `:has()` rule on the card, and jsdom resolves no such
 * style. A real engine measures the chart, so the chart takes the spark tier in
 * a narrow tile, and the card reads it.
 */
describe('dashboard spark veil (real browser)', () => {
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

	it('veils the header of a spark tile at rest, and leaves a wider tile alone', async () => {
		renderUI(<Board />)

		await expect.poll(() => tierOf('spark')).toBe('spark')

		await expect.poll(() => tierOf('wide')).not.toBe('spark')

		const spark = parts('spark')

		const wide = parts('wide')

		expect(style(spark.header).position).toBe('absolute')

		await expect.poll(() => style(spark.header).opacity).toBe('0')

		expect(style(spark.header).pointerEvents).toBe('none')

		// Out of the flow, the header leaves the content box the full height of the card.
		expect(spark.content?.getBoundingClientRect().top).toBeLessThan(
			(spark.header?.getBoundingClientRect().bottom ?? 0) - 8,
		)

		expect(style(wide.header).position).toBe('static')

		expect(style(wide.header).opacity).toBe('1')
	})

	it('shows the veil while the pointer is over the tile', async () => {
		renderUI(<Board />)

		await expect.poll(() => tierOf('spark')).toBe('spark')

		const { tile, header } = parts('spark')

		await userEvent.hover(tile)

		await expect.poll(() => style(header).opacity).toBe('1')

		expect(style(header).pointerEvents).toBe('auto')
	})

	it('shows the veil when a control of the header takes the focus', async () => {
		renderUI(<Board />)

		await expect.poll(() => tierOf('spark')).toBe('spark')

		const { header } = parts('spark')

		screen.getByRole('button', { name: 'Expand Trend spark' }).focus()

		await expect.poll(() => style(header).opacity).toBe('1')
	})

	it('leaves the header in the flow when a spark chart sits in the actions of a wide tile', async () => {
		renderUI(
			<div style={{ width: 960 }}>
				<Dashboard
					aria-label="Board"
					layout={{ value: [{ id: 'wide', x: 0, y: 0, w: 12, h: 12 }] }}
				>
					<DashboardTile
						id="wide"
						title="Trend wide"
						minWidth={0}
						actions={
							<div style={{ width: 96, height: 24 }}>
								<LineChart
									aria-label="Chart in the actions"
									data={DATA}
									series={[{ xKey: 'label', yKey: 'value', yName: 'Value' }]}
									aspectRatio={false}
								/>
							</div>
						}
					>
						<p>Body</p>
					</DashboardTile>
				</Dashboard>
			</div>,
		)

		await expect.poll(() => tierOf('wide')).toBe('spark')

		const { header } = parts('wide')

		expect(style(header).position).toBe('static')

		expect(style(header).opacity).toBe('1')
	})

	it('keeps the veil in view in edit mode, with one content height in both modes', async () => {
		const { rerender } = renderUI(<Board />)

		await expect.poll(() => tierOf('spark')).toBe('spark')

		const rest = parts('spark').content?.getBoundingClientRect().height

		rerender(<Board editing />)

		const { header, content } = parts('spark')

		expect(style(header).position).toBe('absolute')

		await expect.poll(() => style(header).opacity).toBe('1')

		expect(screen.getByRole('button', { name: 'Move Trend spark' })).toBeVisible()

		expect(content?.getBoundingClientRect().height).toBe(rest)
	})
})
