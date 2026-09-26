import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { DashboardLayout } from '../../layouts'
import { present, renderUI } from '../helpers'

/**
 * The filter rail of a DashboardLayout starts at the top of the main column from `lg`.
 *
 * The layout is a Flex that turns from a column to a row at `lg`. A row takes a centered cross
 * axis by default, so the short rail sat halfway down a tall main column. The layout now aligns
 * the row to the start.
 *
 * Rides the real browser because the claim is a computed layout: jsdom loads no stylesheet.
 */
describe('the DashboardLayout filter rail (real browser)', () => {
	beforeAll(() => page.viewport(1280, 800))

	afterAll(() => page.viewport(414, 896))

	it('aligns the rail to the top of a taller main column', () => {
		const { container } = renderUI(
			<DashboardLayout filters={<div style={{ height: 40 }}>Status</div>}>
				<div style={{ height: 600 }}>Results</div>
			</DashboardLayout>,
		)

		const rail = present(container.querySelector('[data-slot="filters"]'), 'filters')

		const main = present(container.querySelector('[data-slot="main"]'), 'main')

		expect(rail.getBoundingClientRect().top).toBe(main.getBoundingClientRect().top)
	})
})
