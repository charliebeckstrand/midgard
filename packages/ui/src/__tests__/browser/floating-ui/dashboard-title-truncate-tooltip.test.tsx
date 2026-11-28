import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { LineChart } from '../../../modules/chart/line-chart'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { getSlot, renderUI, screen } from '../../helpers'
import { tooltipAfterHover } from '../helpers/tooltip'

/**
 * The title tooltip of a dashboard tile, against the real floating engine and
 * the real layout. The jsdom suite sees no overflow and mocks
 * `@floating-ui/react`, so the hover tooltip shows only here. A narrow tile puts
 * its chart at the spark tier, and its header row then clips a long title.
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

	const DESCRIPTION = 'Click a bar to filter the other tiles'

	function Board({ editing = false, description }: { editing?: boolean; description?: string }) {
		return (
			<div style={{ width: 960 }}>
				<button type="button">before</button>

				<Dashboard aria-label="Board" editing={editing} layout={{ value: LAYOUT }}>
					{LAYOUT.map(({ id }) => (
						<DashboardTile
							key={id}
							id={id}
							title={TITLES[id]}
							description={id === 'long' ? description : undefined}
							minWidth={0}
						>
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

	/** The tile named `title`, and its title element. */
	function parts(title: string) {
		const tile = screen.getByRole('group', { name: title })

		return {
			tile,
			heading: getSlot(tile, 'card-title'),
		}
	}

	const readTier = (title: string) =>
		parts(title).tile.querySelector('[data-tier]')?.getAttribute('data-tier')

	/** Hovers the title of a tile, after its chart takes the spark tier. */
	async function hoverTitle(title: string) {
		await expect.poll(() => readTier(title)).toBe('spark')

		await userEvent.hover(parts(title).heading)
	}

	it('shows the full title in a tooltip when the header row clips it', async () => {
		renderUI(<Board />)

		await hoverTitle(LONG)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)
	})

	it('opens no tooltip on a title that fits the header row', async () => {
		renderUI(<Board />)

		await hoverTitle(SHORT)

		// An enabled tooltip opens at the 250 ms hover delay. Wait past it, with no
		// pointer leave to cancel it, and then look.
		expect(await tooltipAfterHover()).toBeNull()
	})

	it('shows a cut description in the tooltip on a hover of the heading', async () => {
		renderUI(<Board description={DESCRIPTION} />)

		await expect.poll(() => readTier(LONG)).toBe('spark')

		await userEvent.hover(getSlot(parts(LONG).tile, 'card-description'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)

		expect(tip).toHaveTextContent(DESCRIPTION)
	})

	/** Tabs from the button before the board into the first tile. */
	const tabIntoTile = vi.defineHelper(async () => {
		await expect.poll(() => readTier(LONG)).toBe('spark')

		const before = screen.getByRole('button', { name: 'before' })

		// The pointer rests on the button before the board, so a hover cannot open the tooltip.
		await userEvent.hover(before)

		// A real Tab, not `focus()`. The tooltip opens on a focus that matches
		// `:focus-visible`, and an earlier test can leave a pointer input.
		before.focus()

		await userEvent.tab()

		expect(parts(LONG).tile).toContainElement(document.activeElement as HTMLElement)
	})

	// The title is not focusable. The keyboard reaches the tile through its
	// controls and its widget, so a focus in the tile shows the reveal.
	it('shows the full title when the keyboard focus enters the tile', async () => {
		renderUI(<Board description={DESCRIPTION} />)

		await tabIntoTile()

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)

		expect(tip).toHaveTextContent(DESCRIPTION)
	})

	it('closes the focus reveal on Escape while the focus stays in the tile', async () => {
		renderUI(<Board />)

		await tabIntoTile()

		await screen.findByRole('tooltip')

		const focused = document.activeElement

		await userEvent.keyboard('{Escape}')

		await expect.poll(() => screen.queryByRole('tooltip')).toBeNull()

		expect(document.activeElement).toBe(focused)
	})

	it('opens no tooltip in edit mode, where the title is a part of the drag surface', async () => {
		renderUI(<Board editing />)

		await hoverTitle(LONG)

		expect(await tooltipAfterHover()).toBeNull()
	})
})
