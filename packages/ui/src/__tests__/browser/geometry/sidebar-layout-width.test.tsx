import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { densitySteps, writeRootDensity } from '../../../core/density'
import { rootOffcanvasSidebarClass } from '../../../core/sidebar/root'
import { SidebarLayout, SidebarLayoutBody } from '../../../layouts'
import { frames, getSlot, present, renderUI } from '../../helpers'
import { settledRect } from '../helpers/sample'

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
		writeRootDensity(document.documentElement, 'md')

		document.documentElement.classList.remove(rootOffcanvasSidebarClass)
	})

	it.for(densitySteps)(
		'gives the floating sidebar the width of the rail at %s',
		async (step, { signal }) => {
			writeRootDensity(document.documentElement, step)

			const inline = renderUI(
				<SidebarLayout sidebar={<nav>Links</nav>}>
					<SidebarLayoutBody>Content</SidebarLayoutBody>
				</SidebarLayout>,
			)

			await frames()

			const rail = present(
				inline.container.firstElementChild?.querySelector<HTMLElement>(
					':scope > :not([aria-hidden])',
				),
				'rail',
			)

			const railWidth = rail.getBoundingClientRect().width

			inline.unmount()

			// The `afterEach` above removes the class. A case that times out runs
			// that hook before its body resumes here, so stop the body first.
			signal.throwIfAborted()

			document.documentElement.classList.add(rootOffcanvasSidebarClass)

			const floating = renderUI(
				<SidebarLayout sidebar={<nav>Links</nav>}>
					<SidebarLayoutBody>Content</SidebarLayoutBody>
				</SidebarLayout>,
			)

			await frames()

			const strip = present(
				floating.container.firstElementChild?.querySelector<HTMLElement>(':scope > [aria-hidden]'),
				'hover strip',
			)

			await userEvent.hover(strip)

			const sheet = await settledRect(getSlot(document.body, 'sheet'))

			expect(sheet.getBoundingClientRect().width).toBe(railWidth)

			// The buffer starts at the far edge of the sheet.
			const buffer = present(
				document.querySelector<HTMLElement>('body > [aria-hidden].fixed'),
				'pointer buffer',
			)

			expect(buffer.getBoundingClientRect().left).toBe(railWidth)
		},
	)
})
