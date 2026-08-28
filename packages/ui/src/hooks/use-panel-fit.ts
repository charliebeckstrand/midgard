'use client'

import { type AnimationPlaybackControls, animate, type ValueAnimationTransition } from 'motion'
import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'

/** What {@link usePanelFit} hands back. @internal */
export type PanelFit = {
	/** Goes on the panel, beside the gesture's own. */
	ref: (node: HTMLDivElement | null) => void
	/**
	 * Whether the content asks for more room than the panel has, so the panel
	 * stands at its ceiling. What squares a top corner against the screen edge.
	 */
	full: boolean
}

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
	 * The size a drag committed, or `null` while the panel sits at its variant's.
	 *
	 * A dragged height is the reader's answer to how much of the screen the panel
	 * gets, and it beats the content's until the panel closes — so this stands the
	 * whole measurement down rather than racing it for the same property.
	 */
	dragged: number | null
	/**
	 * The tallest the panel is drawn at, given the panel and the screen along its
	 * axis. The caller's, for the reason {@link PanelResizeOptions.ceilingOf} is.
	 */
	ceilingOf: (panel: HTMLElement, viewport: number) => number
	/** The travel between two content heights. The panel's kata states it. */
	transition: ValueAnimationTransition<number>
}

/**
 * Growing and shrinking a content-sized panel into what it now holds.
 *
 * The counterpart to `usePanelResize`: that one is the height the reader sets,
 * this one the height the content asks for. Both write the panel's height, so
 * only one of them may be live — a committed drag stands this down.
 *
 * CSS cannot do it. `height` interpolates between two lengths and a box sized by
 * its content has only one, so a panel handed new content snaps to it. The
 * resting height stays CSS's all the same: the panel carries no inline height
 * between travels, so the cap its variant sets is what bounds it and nothing
 * here has to restate a `dvh`.
 *
 * That leaves the observer reading the *arrived* height — layout has already
 * reflowed by the time it fires — so the origin comes from the last height the
 * panel rested at, which is the one the reader was looking at. The pin and the
 * travel are written straight to the element: an observer callback lands after
 * layout and before paint, so the pin reaches no frame of its own, and a render
 * that owned the in-flight height would stamp the resting value back over it.
 *
 * @see {@link useCurrentContentsMorph} for the same motion under a crossfading
 * panel stack, which observes its children instead — a drawer's own box is the
 * measurement, since a capped panel stops moving exactly where it should.
 * @internal
 */
export function usePanelFit({
	enabled,
	dragged,
	ceilingOf,
	transition,
}: PanelFitOptions): PanelFit {
	// The panel as state rather than a ref, for the reason the gesture holds it
	// that way: it is portalled and mounts on a later commit than the one that
	// opens the drawer, so an effect keyed on anything else runs with nothing to
	// observe.
	const [panel, setPanel] = useState<HTMLDivElement | null>(null)

	const ref = useCallback((node: HTMLDivElement | null) => setPanel(node), [])

	const [full, setFull] = useState(false)

	// Imperative `animate` runs outside any `MotionConfig`, so the preference is
	// read here rather than inherited (WCAG 2.3.3). The panel still resizes; it
	// just arrives rather than travels.
	const reduced = useReducedMotion()

	useEffect(() => {
		if (panel === null) return

		// An inline height on a panel no drag holds is a pin this hook left behind,
		// from a travel something interrupted — the variant changing under the
		// panel, or the reader's motion preference. Clearing it first hands the box
		// back to layout, so the baseline below is measured rather than inherited.
		//
		// A drag's height is not ours to clear. The render that starts the gesture
		// writes it, and that lands before this does.
		if (dragged === null) panel.style.height = ''

		if (!enabled || dragged !== null) return

		const box = panel.getBoundingClientRect()

		// The height the panel last rested at, and the width it rested at. Both are
		// re-read here rather than held across the stand-down, because a drag hands
		// the panel back at whatever size it was left at.
		let height = box.height

		let width = box.width

		let travel: AnimationPlaybackControls | null = null

		/** Whether the content has more to show than the panel can stand at. */
		const report = (at: number) => setFull(at >= ceilingOf(panel, window.innerHeight) - 1)

		report(height)

		/**
		 * Hands the box back to layout, which is what states the resting height, and
		 * puts the panel back under observation.
		 *
		 * Re-observing delivers the box once by itself, which is the re-read a
		 * travel needs: content swapped while the panel was pinned moved nothing
		 * observable, so the height it now asks for is only knowable here.
		 */
		const settle = () => {
			travel = null

			panel.style.height = ''

			observer.observe(panel)
		}

		/** Travels from where the panel stands to the height its content now asks for. */
		const move = (to: number) => {
			const from = height

			height = to

			report(to)

			if (from === to || reduced === true) return

			// Off observation for the length of the travel. Every frame writes the
			// height of the box being watched, and an observer answering its own
			// writes is the loop the browser reports as undelivered notifications.
			observer.unobserve(panel)

			panel.style.height = `${from}px`

			travel = animate(from, to, {
				...transition,
				onUpdate: (at) => {
					panel.style.height = `${at}px`
				},
				onComplete: settle,
			})
		}

		const observer = new ResizeObserver(() => {
			// A notification queued before the travel took the panel off observation.
			// The travel is already aimed where the content asked for, and a box in
			// motion would only aim it at itself.
			if (travel !== null) return

			const next = panel.getBoundingClientRect()

			// A width change is the window being resized, and the height that comes
			// with it is layout reflowing rather than content changing. Take it as the
			// new resting size instead of travelling to it: a panel that eased after a
			// window edge would trail the one the reader is holding.
			if (next.width !== width) {
				width = next.width

				height = next.height

				report(next.height)

				return
			}

			move(next.height)
		})

		observer.observe(panel)

		return () => {
			// The pin stays where the last frame put it. A drag taking the height over
			// has already written its own by now, and clearing here would drop the
			// panel to its content mid-gesture.
			travel?.stop()

			travel = null

			observer.disconnect()
		}
	}, [panel, enabled, dragged, ceilingOf, transition, reduced])

	return { ref, full }
}
