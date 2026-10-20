import { describe, expect, it } from 'vitest'
import { getScroller } from '../../utilities/get-scroller'
import { present, renderUI, screen } from '../helpers'

/**
 * `getScroller` walks up from a node for the first element that
 * scrolls. The `overflowing` option also asks whether `scrollHeight` exceeds
 * `clientHeight`. jsdom reports those sizes as zero, so these cases run in a
 * real browser, where the boxes really overflow, or really do not.
 */

/** The node the walk starts from. */
function start(): HTMLElement {
	return present(screen.getByTestId('child'), 'the starting node')
}

describe('getScroller against real overflow', () => {
	it('returns null when the start node is null', () => {
		expect(getScroller(null)).toBeNull()
	})

	it('returns the nearest ancestor that both scrolls and overflows', () => {
		renderUI(
			<div data-testid="scroller" style={{ height: 100, overflowY: 'auto' }}>
				<div style={{ height: 400 }}>
					<div data-testid="child" />
				</div>
			</div>,
		)

		expect(getScroller(start(), { overflowing: true })).toBe(screen.getByTestId('scroller'))
	})

	it('skips an ancestor whose content does not exceed its viewport when overflowing', () => {
		// `overflow-y: auto` with content that fits: scrollable by style, not in
		// fact, so the walk must pass it by rather than return a box with no travel.
		renderUI(
			<div data-testid="scroller" style={{ height: 100, overflowY: 'auto' }}>
				<div style={{ height: 50 }}>
					<div data-testid="child" />
				</div>
			</div>,
		)

		expect(getScroller(start(), { overflowing: true })).toBeNull()
	})

	it('returns an ancestor by its overflow value alone by default', () => {
		// A virtualizer reads the container before its rows render, so the
		// content does not overflow yet.
		renderUI(
			<div data-testid="scroller" style={{ height: 100, overflowY: 'auto' }}>
				<div style={{ height: 50 }}>
					<div data-testid="child" />
				</div>
			</div>,
		)

		expect(getScroller(start())).toBe(screen.getByTestId('scroller'))
	})

	it('returns the start node itself when it scrolls', () => {
		renderUI(
			<div style={{ height: 100, overflowY: 'auto' }}>
				<div data-testid="child" style={{ height: 50, overflowY: 'auto' }} />
			</div>,
		)

		expect(getScroller(start())).toBe(start())
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

		expect(getScroller(start())).toBeNull()
	})

	it('matches the inline axis only when inline is set', () => {
		renderUI(
			<div data-testid="scroller" style={{ width: 100, overflowX: 'auto' }}>
				<div style={{ width: 400, height: 10 }}>
					<div data-testid="child" />
				</div>
			</div>,
		)

		expect(getScroller(start(), { overflowing: true })).toBeNull()

		expect(getScroller(start(), { inline: true, overflowing: true })).toBe(
			screen.getByTestId('scroller'),
		)
	})

	it('ends the walk at a clipping ancestor when stopAtClip is set', () => {
		renderUI(
			<div style={{ height: 100, overflowY: 'auto' }}>
				<div style={{ height: 50, overflow: 'hidden' }}>
					<div data-testid="child" />
				</div>
			</div>,
		)

		expect(getScroller(start(), { stopAtClip: true })).toBeNull()

		expect(getScroller(start())).not.toBeNull()
	})

	it('never returns the body or the root', () => {
		document.body.style.overflowY = 'auto'

		try {
			renderUI(<div data-testid="child" />)

			expect(getScroller(start())).toBeNull()
		} finally {
			document.body.style.overflowY = ''
		}
	})
})
