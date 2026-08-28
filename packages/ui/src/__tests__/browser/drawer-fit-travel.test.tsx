import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Drawer, DrawerBody } from '../../components/drawer'
import {
	bySlot,
	frames,
	hasIntermediate,
	present,
	renderUI,
	sampleHeights,
	screen,
	waitFor,
} from '../helpers'

/**
 * Real-browser probe of the `fit` drawer's height. Everything this variant does
 * is a measurement — the panel takes the height its content asks for, stops at
 * the screen when the content asks for more, and travels between two of those
 * heights rather than snapping — and jsdom lays nothing out, so the jsdom suite
 * can only see the classes. The travel runs imperatively (`animate` from
 * `motion`, unmocked in this suite) against real layout, so these cases sample
 * the panel's border box across frames.
 */

/** A `fit` drawer whose one content block swaps between two heights. */
function FitProbe({ short, tall, handle }: { short: number; tall: number; handle?: boolean }) {
	const [grown, setGrown] = useState(false)

	return (
		<>
			<button type="button" data-testid="swap" onClick={() => setGrown(true)}>
				swap
			</button>

			<Drawer open handle={handle} height="fit" onOpenChange={() => {}} aria-label="Probe">
				<DrawerBody>
					<div style={{ height: grown ? tall : short }} />
				</DrawerBody>
			</Drawer>
		</>
	)
}

describe('fit drawer height (real browser)', () => {
	it('opens at the height its content asks for, and travels to the next one', async () => {
		renderUI(<FitProbe short={120} tall={320} />)

		const panel = present(bySlot(document.body, 'drawer'), 'drawer panel')

		const swap = screen.getByTestId('swap')

		// Sized by what it holds, not by a step: the panel clears its content and
		// stops well short of the screen it could have taken.
		const short = panel.getBoundingClientRect().height

		expect(short).toBeGreaterThan(120)

		expect(short).toBeLessThan(window.innerHeight)

		// The panel takes its baseline from the observer's first delivery, which
		// lands at the end of the frame. A swap before then has no height to leave
		// from and rightly adopts the new one rather than travelling on the frame
		// the panel is still arriving on; this case is about the swaps after.
		await frames()

		swap.click()

		const samples = await sampleHeights(panel, 800)

		// The swap must never present the incoming height in the first frame: the
		// panel leaves the height it opened at through the ones between.
		expect(hasIntermediate(samples, short, short + 200)).toBe(true)

		// It lands on the content's own height — 200 more than it opened at — and
		// hands the box back to layout.
		await waitFor(() => expect(panel.getBoundingClientRect().height - short).toBeCloseTo(200, 0))

		await waitFor(() => expect(panel.style.height).toBe(''))
	})

	it('leaves a dragged height alone when the content changes under it', async () => {
		renderUI(<FitProbe short={120} tall={320} handle />)

		const panel = present(bySlot(document.body, 'drawer'), 'drawer panel')

		const swap = screen.getByTestId('swap')

		const handle = present(bySlot(document.body, 'drawer-handle'), 'drag handle')

		await frames()

		// The keyboard half of the same gesture: one arrow commits a height the way
		// a released drag does, without a synthetic pointer.
		handle.focus()

		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))

		await waitFor(() => expect(panel.style.height).not.toBe(''))

		const dragged = panel.getBoundingClientRect().height

		swap.click()

		// A dragged height is the reader's answer to how much of the screen the
		// panel gets, and content arriving under it does not overrule them — on no
		// frame, not merely by the time the content has settled.
		const samples = await sampleHeights(panel, 400)

		expect(samples.every((height) => Math.abs(height - dragged) < 1)).toBe(true)
	})

	it('stops at the screen and squares its corners when the content asks for more', async () => {
		renderUI(
			<Drawer open height="fit" onOpenChange={() => {}} aria-label="Tall">
				<DrawerBody>
					<div style={{ height: window.innerHeight + 400 }} />
				</DrawerBody>
			</Drawer>,
		)

		const panel = present(bySlot(document.body, 'drawer'), 'drawer panel')

		expect(panel.getBoundingClientRect().height).toBeCloseTo(window.innerHeight, 0)

		// A rounded corner against the screen edge reads as a panel that failed to
		// reach it, so a panel standing there says so and the recipe squares it.
		await waitFor(() => expect(panel).toHaveAttribute('data-full'))

		await waitFor(() => expect(getComputedStyle(panel).borderTopLeftRadius).toBe('0px'))
	})
})
