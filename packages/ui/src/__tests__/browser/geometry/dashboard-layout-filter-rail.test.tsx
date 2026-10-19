import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { DashboardLayout } from '../../../layouts'
import { present, renderUI } from '../../helpers'

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

/**
 * A `layout` map that names no `initial` value keeps the drawer below its first breakpoint. The
 * JavaScript always read `drawer` there, but the CSS had no unprefixed classes, so a phone showed
 * the rail and the drawer trigger together.
 */
describe('a DashboardLayout layout map with no initial value (real browser)', () => {
	beforeAll(() => page.viewport(375, 800))

	it('shows the drawer trigger and hides the rail below the first breakpoint', () => {
		const { container } = renderUI(
			<DashboardLayout layout={{ md: 'inline' }} filters={<div>Status</div>}>
				<div>Results</div>
			</DashboardLayout>,
		)

		const rail = present(container.querySelector('[data-slot="filters"] > *'), 'the rail')

		expect(getComputedStyle(rail).display).toBe('none')

		const trigger = present(container.querySelector('button'), 'the drawer trigger')

		expect(trigger.getBoundingClientRect().width).toBeGreaterThan(0)
	})
})
