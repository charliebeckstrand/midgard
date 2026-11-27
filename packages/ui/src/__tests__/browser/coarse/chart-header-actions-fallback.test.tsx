import { describe, expect, it } from 'vitest'
import { ChartHeaderActionsFallback, SeatChart } from '../../../modules/chart'
import { HeaderActions, HeaderActionsSlot } from '../../../primitives/header-actions'
import { attach, getSlot } from '../../helpers'
import { hydrate, serverMarkup } from '../../helpers/hydrate'

/**
 * The fallback of a chart draws the buttons of the header row in the server
 * render (`geometry/chart-header-actions-fallback.test.tsx`). The menu button of
 * the chart shows only on a coarse pointer. The page has a touch screen, so this
 * case holds the menu button at the same box before and after the hydration,
 * with one copy on the screen.
 */
const chart = (
	<SeatChart
		aria-label="Senate seats"
		groups={[
			{ seats: 47, color: 'blue', label: 'Democrats' },
			{ seats: 53, color: 'red', label: 'Republicans' },
		]}
		contextMenu={{ button: true }}
		height={200}
	/>
)

const box = (
	<HeaderActions slotted>
		<div style={{ width: 360 }}>
			<div className="flex min-h-9 justify-between">
				<span>Senate</span>

				<div className="flex items-center gap-1">
					<HeaderActionsSlot>
						<ChartHeaderActionsFallback chart={chart} />
					</HeaderActionsSlot>
				</div>
			</div>

			{chart}
		</div>
	</HeaderActions>
)

/** The menu buttons of the chart that show, with their boxes. */
function shown(container: Element) {
	return [...container.querySelectorAll('[data-slot="chart-menu-button"]')]
		.filter((node) => node.getClientRects().length > 0)
		.map((node) => {
			const { left, top, right, bottom } = node.getBoundingClientRect()

			return { left, top, right, bottom }
		})
}

describe('chart menu button in the header row before the mount, on a coarse pointer', () => {
	it('draws the menu button in the server render where the chart puts it', () => {
		const container = attach(serverMarkup(box))

		const before = shown(container)

		expect(before).toHaveLength(1)

		const { onRecoverableError } = hydrate(container, box)

		expect(onRecoverableError).not.toHaveBeenCalled()

		// The chart has put its own buttons in the slot, and the fallback hides.
		expect(getComputedStyle(getSlot(container, 'header-actions-fallback')).display).toBe('none')

		const after = shown(container)

		expect(after).toHaveLength(1)

		expect(after[0]).toMatchBox(before[0] as (typeof before)[number])
	})
})
