import { describe, expect, it } from 'vitest'
import { useGridTruncation } from '../../modules/grid/use-grid-truncation'
import { act, renderUI, waitFor } from '../helpers'

/**
 * Resize-settle reconciliation for the grid's overflow detector. A column
 * drag-resize moves a cell's width through the `<colgroup>` without re-rendering
 * the memoized cell on its own, so the body takes a settled-width snapshot whose
 * change re-renders the cell to re-measure. Should the width land a frame after
 * the synchronous read, the hook's deferred backstop re-measures on the next
 * frame whenever its re-measure key (the grid's per-column settle width) changes
 * — which this test drives directly with `signal`.
 *
 * Real layout is required (jsdom reports zero overflow). The clip is flipped by
 * squeezing the *content* (`letter-spacing`) rather than resizing the box, so
 * the observed box never changes size and the `ResizeObserver` stays silent on
 * its own — isolating the deferred pass without stubbing the shared observer.
 */
function Leaf({ signal }: { signal: number }) {
	const [ref, truncated] = useGridTruncation<HTMLDivElement>(signal)

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
	it('clears a stale truncated flag on the next frame after the settle key flips', async () => {
		const { getByTestId, rerender } = renderUI(<Leaf signal={0} />)

		const leaf = getByTestId('leaf')

		const flag = () => getByTestId('flag').textContent

		// Content overflows the 60px box → flagged truncated.
		await waitFor(() => expect(flag()).toBe('truncated'))

		await act(async () => {
			// Flip the settle key: the commit measure runs while the content still
			// overflows, so the flag stays truncated.
			rerender(<Leaf signal={1} />)

			// Now squeeze the content to fit *after* that commit — as a column width
			// settling a frame late would shrink the overflow. The box stays 60px so
			// the observer doesn't fire, and nothing re-renders, so only the deferred
			// rAF measure can catch it.
			leaf.style.letterSpacing = '-20px'

			await new Promise((resolve) => setTimeout(resolve, 80))
		})

		expect(flag()).toBe('fits')
	})
})
