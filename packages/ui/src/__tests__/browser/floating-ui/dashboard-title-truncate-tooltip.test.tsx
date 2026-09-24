import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { LineChart } from '../../../modules/chart/line-chart'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { getSlot, present, renderUI, screen } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * The title tooltip of a dashboard tile, against the real floating engine and
 * the real layout. The jsdom suite sees no overflow and mocks
 * `@floating-ui/react`, so the hover tooltip shows only here. A narrow tile puts
 * its chart at the spark tier, and the veil then clips a long title.
 */
describe('dashboard tile title truncation tooltip (real browser)', () => {
	const DATA = [3, 8, 5, 9, 4, 7].map((value, index) => ({ label: `d${index}`, value }))

	const LONG = 'Units sold across every region this week'

	const SHORT = 'Units'

	// At 960 px, a column is 40 px. Each tile gives its chart under 160 px.
	const LAYOUT: DashboardLayoutItem[] = [
		{ id: 'long', x: 0, y: 0, w: 3, h: 12 },
		{ id: 'short', x: 3, y: 0, w: 3, h: 12 },
	]

	const TITLES: Record<string, string> = { long: LONG, short: SHORT }

	function Board({ editing = false }: { editing?: boolean }) {
		return (
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Board" editing={editing} layout={{ value: LAYOUT }}>
					{LAYOUT.map(({ id }) => (
						<DashboardTile key={id} id={id} title={TITLES[id]} minWidth={0}>
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

	/** The tile named `title`, its header row, and its title element. */
	function parts(title: string) {
		const tile = screen.getByRole('group', { name: title })

		return {
			tile,
			header: present(tile.querySelector(':scope > [data-slot="card-header"]'), 'the header row'),
			heading: getSlot(tile, 'card-title'),
		}
	}

	const tierOf = (title: string) =>
		parts(title).tile.querySelector('[data-tier]')?.getAttribute('data-tier')

	/**
	 * Hovers the tile, so that the veil takes the pointer, and then hovers the
	 * title. At rest the veil lets the pointer through until the tile is hovered.
	 */
	async function hoverTitle(title: string) {
		await expect.poll(() => tierOf(title)).toBe('spark')

		const { tile, header, heading } = parts(title)

		await userEvent.hover(tile)

		await expect.poll(() => getComputedStyle(header).pointerEvents).toBe('auto')

		await userEvent.hover(heading)
	}

	it('shows the full title in a tooltip when the veil clips it', async () => {
		renderUI(<Board />)

		await hoverTitle(LONG)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)
	})

	it('opens no tooltip on a title that fits the veil', async () => {
		renderUI(<Board />)

		await hoverTitle(SHORT)

		// An enabled tooltip opens at the 250 ms hover delay. Wait past it, with no
		// pointer leave to cancel it, and then look.
		await pause(400)

		expect(screen.queryByRole('tooltip')).toBeNull()
	})

	it('opens no tooltip in edit mode, where the title is a part of the drag surface', async () => {
		renderUI(<Board editing />)

		await expect.poll(() => tierOf(LONG)).toBe('spark')

		await userEvent.hover(parts(LONG).heading)

		await pause(400)

		expect(screen.queryByRole('tooltip')).toBeNull()
	})
})
