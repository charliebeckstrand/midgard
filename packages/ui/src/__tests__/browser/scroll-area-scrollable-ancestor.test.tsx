import { describe, expect, it } from 'vitest'
import { findScrollableAncestor } from '../../components/scroll-area/scroll-area-utilities'
import { present, renderUI, screen } from '../helpers'

/**
 * `findScrollableAncestor` walks up from a node for the first ancestor that
 * both allows scrolling and actually overflows. Both halves of that test are
 * layout: the computed overflow style, and whether `scrollHeight` exceeds
 * `clientHeight`. jsdom reports the second pair as zero, so its unit suite
 * wrote the numbers onto detached elements — which meant the case decided the
 * answer it was checking. Here the boxes really overflow, or really do not.
 */

/** The node the walk starts from. */
function start(): HTMLElement {
	return present(screen.getByTestId('child'), 'the starting node')
}

describe('findScrollableAncestor against real overflow', () => {
	it('returns null when the start node is null', () => {
		expect(findScrollableAncestor(null)).toBeNull()
	})

	it('returns the nearest ancestor that both scrolls and overflows', () => {
		renderUI(
			<div data-testid="scroller" style={{ height: 100, overflowY: 'auto' }}>
				<div style={{ height: 400 }}>
					<div data-testid="child" />
				</div>
			</div>,
		)

		expect(findScrollableAncestor(start())).toBe(screen.getByTestId('scroller'))
	})

	it('skips an ancestor whose content does not exceed its viewport', () => {
		// `overflow-y: auto` with content that fits: scrollable by style, not in
		// fact, so the walk must pass it by rather than return a box with no travel.
		renderUI(
			<div data-testid="scroller" style={{ height: 100, overflowY: 'auto' }}>
				<div style={{ height: 50 }}>
					<div data-testid="child" />
				</div>
			</div>,
		)

		expect(findScrollableAncestor(start())).toBeNull()
	})

	it('returns null when no ancestor allows scrolling at all', () => {
		// Tall content, but every ancestor is `visible`: the overflow spills rather
		// than scrolls, so there is nothing to scroll into view.
		renderUI(
			<div style={{ height: 100 }}>
				<div style={{ height: 400 }}>
					<div data-testid="child" />
				</div>
			</div>,
		)

		expect(findScrollableAncestor(start())).toBeNull()
	})
})
