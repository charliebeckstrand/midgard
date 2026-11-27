import { describe, expect, it } from 'vitest'
import { renderUI, screen } from '../helpers'
import { expectRingShows, panels, scrollDown, scrollingPanels } from './helpers/tab-panel-ring'

/**
 * A tab panel with no focusable content is a Tab stop (APG tabs pattern), so
 * it must show where the focus is (WCAG 2.4.7). An animating `TabContents`
 * clips its panels for the switch. Thus the ring of a panel must stay inside
 * the box of the panel, or the container cuts it off. A panel that scrolls
 * must keep its ring on its box while its content scrolls. The forced half is
 * `forced/tab-panel-focus-ring.test.tsx`.
 */
describe('tab panel focus ring (real browser)', () => {
	it.for(Object.entries(panels))('%s: the ring of the panel shows', async ([, ui]) => {
		renderUI(<div className="p-4">{ui}</div>)

		expect(screen.getAllByRole('tab')).toHaveLength(2)

		await expectRingShows()
	})
})

describe('tab panel focus ring in a panel that scrolls (real browser)', () => {
	it.for([
		['no animation', false],
		['a fade', 'fade'],
	] as const)('tabs with %s: the ring stays on the panel after a scroll', async ([, animate]) => {
		renderUI(<div className="w-80 p-4">{scrollingPanels(animate)}</div>)

		await expectRingShows(scrollDown)
	})
})
