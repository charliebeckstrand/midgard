import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { densitySteps } from '../../core/density'
import { SidebarLayout, SidebarLayoutBody } from '../../layouts'
import { frames, present, renderUI } from '../helpers'
import { settledSheet } from './helpers/settled-sheet'

/**
 * The floating sidebar is as wide as the inline rail at each density step.
 *
 * The inline rail takes its width from the nearest density scope. The floating
 * sheet was 20rem at each step, so the sidebar changed its width when it went
 * from inline to floating, and its text wrapped again. The sheet and the pointer
 * buffer beside it now take the width of the rail at each step.
 *
 * Rides the real browser because jsdom loads no stylesheet and lays nothing out.
 */
describe('sidebar layout width (real browser)', () => {
	// The desktop sidebar renders from `lg` up.
	beforeAll(() => page.viewport(1280, 800))

	afterEach(() => {
		document.documentElement.removeAttribute('data-density')
	})

	it.each(densitySteps)('gives the floating sidebar the width of the rail at %s', async (step) => {
		document.documentElement.setAttribute('data-density', step)

		const inline = renderUI(
			<SidebarLayout sidebar={<nav>Links</nav>}>
				<SidebarLayoutBody>Content</SidebarLayoutBody>
			</SidebarLayout>,
		)

		await frames()

		const rail = present(inline.container.firstElementChild?.firstElementChild, 'rail')

		const railWidth = rail.getBoundingClientRect().width

		inline.unmount()

		const floating = renderUI(
			<SidebarLayout floating sidebar={<nav>Links</nav>}>
				<SidebarLayoutBody>Content</SidebarLayoutBody>
			</SidebarLayout>,
		)

		await frames()

		const strip = present(
			floating.container.firstElementChild?.querySelector<HTMLElement>(':scope > [aria-hidden]'),
			'hover strip',
		)

		await userEvent.hover(strip)

		const sheet = await settledSheet()

		expect(sheet.getBoundingClientRect().width).toBe(railWidth)

		// The buffer starts at the far edge of the sheet.
		const buffer = present(
			document.querySelector<HTMLElement>('body > [aria-hidden].fixed'),
			'pointer buffer',
		)

		expect(buffer.getBoundingClientRect().left).toBe(railWidth)
	})
})
