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

	it('keeps a short name on the line of its value, and starts a long name under it', async () => {
		renderUI(
			<TooltipPointer open point={{ x: 640, y: 400 }} track="point">
				<ChartReadoutCard title="Oct 19">
					<ChartReadoutRow
						swatch={<ReadoutSwatch shape="line" />}
						value={<span data-testid="short-value">76%</span>}
						label={<span data-testid="short-label">OCR Success</span>}
					/>
					<ChartReadoutRow
						swatch={<ReadoutSwatch shape="line" />}
						value={<span data-testid="long-value">Hold for review</span>}
						label={<span data-testid="long-label">{LONG}</span>}
					/>
				</ChartReadoutCard>
			</TooltipPointer>,
		)

		const panel = await waitFor(() => present(bySlot(document.body, 'tooltip-content'), 'tooltip'))

		const box = (await settledRect(panel)).getBoundingClientRect()

		const rect = (id: string) => page.getByTestId(id).element().getBoundingClientRect()

		// A short name shares the line of its value.
		expect(rect('short-label').top).toBe(rect('short-value').top)

		// A long name starts its own line under the value, at the left of the
		// value, so the two do not wrap as two narrow columns.
		const value = rect('long-value')

		expect(rect('long-label').top).toBeGreaterThan(value.top + value.height / 2)

		expect(rect('long-label').left).toBe(rect('long-value').left)

		expect(rect('long-label').right).toBeLessThanOrEqual(box.right)
	})
})
