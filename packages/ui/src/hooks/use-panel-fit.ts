'use client'

import type { AnimationPlaybackControls, ValueAnimationTransition } from 'motion'
import { useReducedMotion } from 'motion/react'
import { type RefCallback, useCallback, useEffect, useState } from 'react'
import { type BorderBox, measureBox } from '../utilities'
import { travelHeight } from './travel-height'
import type { PanelCeiling } from './use-panel-resize'

/**
 * One rule, for every comparison below: two readings within a pixel of each
 * other are the same reading.
 *
 * Layout answers in fractions, and each of the three asks whether something is
 * so — the window resized, the content changed, the panel reached its ceiling.
 * Read exactly, a fraction of a pixel answers yes to all three.
 */
const SUBPIXEL = 1

/** What {@link usePanelFit} needs. @internal */
export type PanelFitOptions = {
	/**
	 * Whether the panel takes its height from what it holds.
	 *
	 * A panel whose variant fixes the height needs none of this: two lengths
	 * interpolate, so CSS already travels between them.
	 */
	enabled: boolean
	/**
	 * Whether a drag holds the panel's height.
	 *
	 * A dragged height is the reader's answer to how much of the screen the panel
	 * gets, and it beats the content's until the panel closes — so this stands the
	 * whole measurement down rather than racing it for the same property. The
	 * number itself is the gesture's; only whether there is one reaches here.
	 */
	dragged: boolean
	/** Where the panel stops. Shared with the gesture, so the two agree. */
	ceilingOf: PanelCeiling
	/** The travel between two content heights. The panel's kata states it. */
	transition: ValueAnimationTransition<number>
}

/**
 * Growing and shrinking a content-sized panel into what it now holds.
 *
 * The counterpart to `usePanelResize`: that one is the height the reader sets,
 * this one the height the content asks for. Both write the panel's height, so
 * only one of them may be live — a drag stands this down.
 *
 * The panel carries `data-full` while its content asks for more room than it
 * has, so it stands at its ceiling; style it to square a corner that now meets
 * the screen edge. Stamped rather than reported back, because it is a
 * measurement the component never holds: state would re-render the panel's whole
 * subtree on every crossing, and square the corner a frame after it arrived.
 *
 * The resting height stays CSS's. The panel carries no inline height between
 * travels, so the cap its variant sets is what bounds it and nothing here has to
 * restate a `dvh` — see {@link travelHeight}, which is where the travel itself
 * lives and which hands the box back on arrival.
 *
 * That leaves the observer reading the *arrived* height, since layout has
 * already reflowed by the time it fires, so the origin is the last height the
 * panel rested at rather than the one it reports.
 *
 * The crossfading panel stack runs the same travel over its children, because a
 * container at `height: auto` cannot see its own content change. A drawer's own
 * box is the measurement instead: capped, it stops moving exactly where it
 * should.
 *
 * @returns A callback ref to attach to the panel, beside the gesture's own.
 * @internal
 */
export function usePanelFit({
	enabled,
	dragged,
	ceilingOf,
	transition,
}: PanelFitOptions): RefCallback<HTMLDivElement> {
	// The panel as state rather than a ref, for the reason the gesture holds it
	// that way: it is portalled and mounts on a later commit than the one that
	// opens the drawer, so an effect keyed on anything else runs with nothing to
	// observe.
	const [panel, setPanel] = useState<HTMLDivElement | null>(null)

	const ref = useCallback((node: HTMLDivElement | null) => setPanel(node), [])

	// Imperative motion runs outside any `MotionConfig`, so the preference is read
	// here rather than inherited (WCAG 2.3.3). The panel still resizes; it just
	// arrives rather than travels.
	const reduced = useReducedMotion()

	useEffect(() => {
		// A drag owns the height while it holds one, and the render that starts the
		// gesture has already written it by the time this runs.
		if (panel === null || dragged) return

		// An inline height on a panel no drag holds is a pin this hook left behind,
		// from a travel something interrupted — the variant changing under the
		// panel, or the reader's motion preference. Clearing it hands the box back
		// to layout, which is where every measurement below starts.
		panel.style.height = ''

		if (!enabled) return

		// The box the panel last rested at, and `null` until it has rested at one.
		// The observer delivers once for a newly observed element, and that first
		// reading has no width to match — which is the case below that adopts a size
		// rather than travelling to it, and so is also how the baseline is taken.
		let rested: BorderBox | null = null

		let travel: AnimationPlaybackControls | null = null

		const observer = new ResizeObserver(([entry]) => {
			const next = measureBox(panel, entry?.borderBoxSize?.[0])

			// A width change is the window being resized, and the height that comes
			// with it is layout reflowing rather than content changing. Starting from
			// the arrived height leaves nowhere to travel: a panel that eased after a
			// window edge would trail the one the reader is holding.
			//
			// Measured against `SUBPIXEL` rather than exactly, because an exact
			// comparison reads layout's own fractions as a resize — and the panel then
			// arrives at its new height with no travel at all, for no reason a reader
			// could see.
			const from =
				rested !== null && Math.abs(rested.inline - next.inline) < SUBPIXEL
					? rested.block
					: next.block

			rested = next

			panel.toggleAttribute(
				'data-full',
				next.block >= ceilingOf(panel, window.innerHeight) - SUBPIXEL,
			)

			if (Math.abs(from - next.block) < SUBPIXEL || reduced) return

			// Off observation for the length of the travel. Every frame writes the
			// height of the box being watched, and an observer answering its own
			// writes is the loop the browser reports as undelivered notifications.
			observer.unobserve(panel)

			travel = travelHeight(panel, from, next.block, transition, () => {
				// Dropped on arrival, so an arrived travel holds neither its own frames
				// nor the closures that captured this panel and observer.
				travel = null

				// Delivers the box once by itself, which is the re-read a travel needs:
				// content swapped while the panel was pinned moved nothing observable,
				// so the height it now asks for is only knowable from here.
				observer.observe(panel)
			})
		})

		observer.observe(panel)

		return () => {
			// Stopping leaves the pin where the last frame put it, which is what a
			// panel handing its height to a drag needs: the render that starts the
			// gesture has already written its own by now, and clearing here would drop
			// the panel to its content mid-gesture.
			travel?.stop()

			observer.disconnect()
		}
	}, [panel, enabled, dragged, ceilingOf, transition, reduced])

	return ref
}
