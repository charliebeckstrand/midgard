import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../../modules/chart'
import { bySlot, fireEvent, getSlot, present, renderUI, waitFor } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * A click-pinned chart readout against the real floating engine. The pin
 * anchors to a client point that the chart computes when it renders. A window
 * scroll fires no render, so the readout must keep its document position and
 * scroll with the plot. The heatmap pins the same way
 * (`heatmap-pinned-tooltip-scroll.test.tsx`).
 */
describe('chart pinned readout (real browser)', () => {
	beforeAll(() => page.viewport(960, 640))

	it('stays on its mark when the window scrolls', async () => {
		const { container } = renderUI(
			<div style={{ paddingBottom: 2000 }}>
				<BarChart
					aria-label="Revenue"
					width={400}
					tooltip={{ trigger: 'click' }}
					crosshair={{ snap: true }}
					data={[
						{ q: 'Q1', r: 4 },
						{ q: 'Q2', r: 8 },
					]}
					series={[{ xKey: 'q', yKey: 'r', yName: 'Revenue' }]}
				/>
			</div>,
		)

		const hit = getSlot(container, 'chart-hit')

		const box = hit.getBoundingClientRect()

		fireEvent.click(hit, { clientX: box.left + box.width / 4, clientY: box.top + box.height / 2 })

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
