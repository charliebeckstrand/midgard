import { describe, it } from 'vitest'
import { renderUI } from '../../helpers'
import { eachAuthorScheme } from '../helpers/forced-colors'
import { expectRingShows, panels, scrollDown, scrollingPanels } from '../helpers/tab-panel-ring'

/**
 * The focus ring of a tab panel under forced colors. The ring is a box-shadow
 * on the panel or on its `::after`, which forced colors remove, so the outline
 * that replaces it must stay inside the boxes that clip the panel. The fine half
 * is `../tab-panel-focus-ring.test.tsx`.
 */
describe('tab panel focus ring under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('the ring of a panel in an animating container shows', async () => {
			renderUI(<div className="p-4">{panels['tabs with a fade']}</div>)

			await expectRingShows()
		})

		it('the ring of a panel that scrolls stays on the panel after a scroll', async () => {
			renderUI(<div className="w-80 p-4">{scrollingPanels('fade')}</div>)

			await expectRingShows(scrollDown)
		})
	})
})
