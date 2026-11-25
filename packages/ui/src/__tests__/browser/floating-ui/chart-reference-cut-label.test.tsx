import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { LineChart } from '../../../modules/chart'
import { getSlot, renderUI, screen } from '../../helpers'

/**
 * The tooltip of a cut reference label, against the real floating engine. The
 * jsdom double of `@floating-ui/react` has no hover, and a hover is the only
 * input that opens this tooltip: its target is SVG that takes no focus.
 */
describe('chart reference cut label (real browser)', () => {
	// A size set inside an `it` reaches the later cases of this file, so the file
	// declares its own width once.
	beforeAll(() => page.viewport(960, 640))

	it('floats the whole label on a hover of the cut label', async () => {
		const label = 'Release of the new invoice classifier'

		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 80 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				reference={[{ category: 'Jan' }, { category: 'Feb', label }, { category: 'Mar' }]}
			/>,
		)

		const cut = getSlot(container, 'chart-reference-label')

		expect(cut).toHaveAttribute('data-cut')

		expect(cut.textContent).not.toBe(label)

		await userEvent.hover(getSlot(container, 'chart-reference-label-target'))

		expect(await screen.findByRole('tooltip')).toHaveTextContent(label)
	})
})
