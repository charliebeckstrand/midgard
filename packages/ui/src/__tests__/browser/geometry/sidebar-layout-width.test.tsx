import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { densitySteps, writeRootDensity } from '../../../core/density'
import { ROOT_OFFCANVAS_SIDEBAR_CLASS } from '../../../core/sidebar/root'
import { SidebarLayout, SidebarLayoutBody } from '../../../layouts'
import type { DensityLevel } from '../../../providers/density/context'
import { DensityProvider } from '../../../providers/density/density'
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

		document.documentElement.classList.remove(ROOT_OFFCANVAS_SIDEBAR_CLASS)
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

			document.documentElement.classList.add(ROOT_OFFCANVAS_SIDEBAR_CLASS)

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
			expect(pointerBuffer().getBoundingClientRect().left).toBe(railWidth)
		},
	)

	// A region of the page can open its own density scope. The sheet follows that
	// scope through its portal, so the buffer has to follow the same one. A buffer
	// on the step of the root covered part of a wider sheet, and left a gap that
	// closed a narrower one as the pointer crossed it.
	it.for<DensityLevel>(['compact', 'loose'])(
		'starts the pointer buffer at the far edge of the sheet in a %s region',
		async (density) => {
			document.documentElement.classList.add(ROOT_OFFCANVAS_SIDEBAR_CLASS)

			const floating = renderUI(
				<DensityProvider density={density}>
					<SidebarLayout sidebar={<nav>Links</nav>}>
						<SidebarLayoutBody>Content</SidebarLayoutBody>
					</SidebarLayout>
				</DensityProvider>,
			)

			await frames()

			const strip = present(
				floating.container.querySelector<HTMLElement>(
					'[data-slot="density"] > div > [aria-hidden]',
				),
				'hover strip',
			)

			await userEvent.hover(strip)

			const sheet = await settledRect(getSlot(document.body, 'sheet'))

			expect(pointerBuffer().getBoundingClientRect().left).toBe(sheet.getBoundingClientRect().right)
		},
	)
})

/** The pointer buffer beside the open floating sidebar. */
function pointerBuffer(): HTMLElement {
	return present(
		document.querySelector<HTMLElement>('[data-slot="portal"] > [aria-hidden].fixed'),
		'pointer buffer',
	)
}
