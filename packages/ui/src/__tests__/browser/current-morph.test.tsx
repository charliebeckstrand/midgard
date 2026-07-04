import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useCurrentContentsMorph } from '../../primitives/current/use-current-contents-morph'
import { renderUI, waitFor } from '../helpers'

/**
 * Real-browser probe of the current-panel height morph. The jsdom morph test
 * mocks `getBoundingClientRect` to a fixed height, so it never sees whether the
 * morph actually fires: in a real browser the auto-height container reflows to
 * the new content height *before* the observer callback reads it, so a naive
 * `from = getBoundingClientRect()` reads the already-advanced height and
 * short-circuits (`from === to`). This drives the discrete-height-change path
 * against real layout and asserts the morph engages.
 */

/**
 * Minimal harness around the hook: a `height: auto`, overflow-hidden container
 * with one in-flow `data-current` panel whose height toggles at constant width.
 * `data-morph` surfaces the hook's internal target so the test can see whether a
 * morph was scheduled.
 */
function Probe() {
	const ref = useRef<HTMLDivElement>(null)

	const [tall, setTall] = useState(false)

	const { morphTo } = useCurrentContentsMorph(ref, true)

	return (
		<div style={{ width: 300 }}>
			<button type="button" data-testid="grow" onClick={() => setTall(true)}>
				grow
			</button>
			<div
				ref={ref}
				data-testid="box"
				data-morph={morphTo === null ? 'none' : String(Math.round(morphTo))}
				style={{ height: morphTo ?? 'auto', overflow: 'hidden', position: 'relative' }}
			>
				<div data-current="" style={{ height: tall ? 240 : 120 }} />
			</div>
		</div>
	)
}

/**
 * `it.fails`: documents a CONFIRMED bug pending fix. Against the shipped hook
 * this assertion fails — the morph never fires, so the container snaps instead
 * of animating. Remove `.fails` once `useCurrentContentsMorph` derives its
 * `from` height from the tracked previous box rather than a post-reflow
 * `getBoundingClientRect`.
 */
describe('current-panel height morph (real browser)', () => {
	it.fails('fires a morph when a panel grows in place at constant width', async () => {
		const { container } = renderUI(<Probe />)

		const box = container.querySelector<HTMLElement>('[data-testid="box"]')

		const grow = container.querySelector<HTMLButtonElement>('[data-testid="grow"]')

		if (!box || !grow) throw new Error('probe did not render')

		// Settle the observer baseline for the initial 120px panel.
		await waitFor(() => expect(box.getBoundingClientRect().height).toBeCloseTo(120, 0))

		// Grow the sole in-flow panel to 240px at unchanged width: a discrete
		// height change the container should morph toward, not snap to.
		grow.click()

		await waitFor(() => expect(box.getAttribute('data-morph')).not.toBe('none'))
	})
})
