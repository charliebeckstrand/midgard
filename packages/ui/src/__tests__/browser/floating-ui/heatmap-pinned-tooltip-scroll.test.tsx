import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { HeatmapChart } from '../../../modules/chart'
import { bySlot, fireEvent, present, renderUI, waitFor } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * A click-pinned heatmap readout against the real floating engine. The pin
 * stores the client point of the click, not the cell. The readout therefore
 * runs on `track="point"`: it keeps its document position, which scrolls with
 * the cell. Under `autoUpdate`, a window scroll re-places it at the stored
 * viewport point, off the cell.
 */
describe('heatmap pinned readout (real browser)', () => {
	beforeAll(() => page.viewport(960, 640))

	it('stays on its cell when the window scrolls', async () => {
		const { container } = renderUI(
			<div style={{ paddingBottom: 2000 }}>
				<HeatmapChart
					aria-label="Commits"
					width={400}
					tooltip={{ trigger: 'click' }}
					data={[
						{ day: 'Mon', hour: '9', n: 1 },
						{ day: 'Mon', hour: '10', n: 9 },
						{ day: 'Tue', hour: '9', n: 4 },
						{ day: 'Tue', hour: '10', n: 6 },
					]}
					series={[{ xKey: 'hour', yKey: 'day', colorKey: 'n', colorRange: ['#fff', '#000'] }]}
				/>
			</div>,
		)

		const hit = present(bySlot(container, 'heatmap-hit'), 'heatmap-hit')

		const box = hit.getBoundingClientRect()

		fireEvent.click(hit, { clientX: box.left + box.width / 4, clientY: box.top + box.height / 4 })

		const tip = await waitFor(() => present(bySlot(document.body, 'tooltip-content'), 'tooltip'))

		await pause(50)

		const offset = () => tip.getBoundingClientRect().top - hit.getBoundingClientRect().top

		const before = offset()

		window.scrollBy(0, 120)

		await pause(100)

		expect(window.scrollY).toBeGreaterThan(0)

		expect(offset()).toBeCloseTo(before, 0)
	})
})
