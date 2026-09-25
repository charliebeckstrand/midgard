import { describe, expect, it } from 'vitest'
import { useGridTruncation } from '../../modules/grid/use-grid-truncation'
import { act, renderUI, waitFor } from '../helpers'
import { pause } from './helpers/wall-clock'

/**
 * Resize-settle reconciliation for the grid's overflow detector. A column
 * drag-resize moves a cell's width through the `<colgroup>` without rendering
 * the cell again, so a visited cell subscribes to its column's settle and
 * measures when it fires. Should the width land a frame after that synchronous
 * read, the hook's deferred backstop re-measures on the next frame. This test
 * fires the settle directly through `settle`.
 *
 * Real layout is required (jsdom reports zero overflow). The clip is flipped by
 * squeezing the *content* (`letter-spacing`) rather than resizing the box, so
 * the observed box never changes size and the `ResizeObserver` stays silent on
 * its own — isolating the deferred pass without stubbing the shared observer.
 *
 * Overflow measurement is contact-gated (a cell scrolled past but never
 * hovered pays no layout read), so the element is armed with a `pointerover`
 * before the flag is expected to reflect anything — the same contact the reveal
 * tooltip it gates always begins with.
 */
/** A settle subscription that the test fires by hand. */
function createSettle() {
	const listeners = new Set<() => void>()

	return {
		subscribe: (listener: () => void) => {
			listeners.add(listener)

			return () => listeners.delete(listener)
		},
		fire: () => {
			for (const listener of listeners) listener()
		},
	}
}

function Leaf({ settle }: { settle: ReturnType<typeof createSettle> }) {
	const [ref, truncated] = useGridTruncation<HTMLDivElement>(settle.subscribe)

	return (
		<>
			<div
				ref={ref}
				data-testid="leaf"
				style={{ width: '60px', display: 'block', overflow: 'hidden', whiteSpace: 'nowrap' }}
			>
				A long value that overflows a narrow box until its letters are squeezed
			</div>
			<output data-testid="flag">{truncated ? 'truncated' : 'fits'}</output>
		</>
	)
}

describe('useGridTruncation resize-settle reconciliation (real browser)', () => {
	it('clears a stale truncated flag on the next frame after the column settles', async () => {
		const settle = createSettle()

		const { getByTestId } = renderUI(<Leaf settle={settle} />)

		const leaf = getByTestId('leaf')

		const flag = () => getByTestId('flag').textContent

		// Arm the detector: measurement stands down until the element sees the
		// pointer/focus contact its reveal opens on.
		await act(async () => {
			leaf.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
		})

		// Content overflows the 60px box → flagged truncated.
		await waitFor(() => expect(flag()).toBe('truncated'))

		await act(async () => {
			// Fire the settle: the synchronous measure runs while the content still
			// overflows, so the flag stays truncated.
			settle.fire()

			// Now squeeze the content to fit *after* that commit — as a column width
			// settling a frame late would shrink the overflow. The box stays 60px so
			// the observer doesn't fire, and nothing re-renders, so only the deferred
			// rAF measure can catch it.
			leaf.style.letterSpacing = '-20px'

			await pause(80)
		})

		expect(flag()).toBe('fits')
	})
})
