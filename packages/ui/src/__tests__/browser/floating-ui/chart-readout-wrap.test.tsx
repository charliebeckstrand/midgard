import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { TooltipPointer } from '../../../components/tooltip/tooltip-pointer'
import {
	ChartReadoutCard,
	ChartReadoutRow,
	ReadoutSwatch,
} from '../../../modules/chart/engine/chart-readout-card'
import { bySlot, present, renderUI, waitFor } from '../../helpers'
import { settledRect } from '../helpers/sample'

/** A value that is wider than the width cap of the tooltip, as a map summary gives. */
const LONG = 'Tacos El Patron, Noodle and Tea, Stella’s Ice Cream, Blue Bottle Coffee and 6 more'

/**
 * A readout with a long title or value stays inside its tooltip.
 *
 * The card set `white-space: nowrap` on the title and the rows, and the tooltip
 * caps its width. A text wider than the cap then went out of the panel on the
 * right. The text now wraps inside the cap.
 *
 * Rides the real browser because the claim is a layout one: jsdom has no
 * layout.
 */
describe('a chart readout with long text (real browser)', () => {
	beforeAll(() => page.viewport(1280, 800))

	it('keeps the title and the row inside the panel', async () => {
		renderUI(
			<TooltipPointer open point={{ x: 640, y: 400 }} track="point">
				<ChartReadoutCard title={<span data-testid="title">{LONG}</span>}>
					<ChartReadoutRow
						data-testid="row"
						swatch={<ReadoutSwatch shape="dot" />}
						value={<span data-testid="value">{LONG}</span>}
					/>
				</ChartReadoutCard>
			</TooltipPointer>,
		)

		const panel = await waitFor(() => present(bySlot(document.body, 'tooltip-content'), 'tooltip'))

		const box = (await settledRect(panel)).getBoundingClientRect()

		for (const id of ['title', 'value']) {
			const text = page.getByTestId(id).element().getBoundingClientRect()

			expect(text.right).toBeLessThanOrEqual(box.right)

			expect(text.left).toBeGreaterThanOrEqual(box.left)
		}
	})
})
