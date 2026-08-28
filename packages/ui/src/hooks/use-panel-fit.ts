'use client'

import { type AnimationPlaybackControls, animate, type ValueAnimationTransition } from 'motion'
import { useReducedMotion } from 'motion/react'
import { type RefCallback, useCallback, useEffect, useState } from 'react'
import { measureBox } from '../utilities'

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
 * only one of them may be live — a drag stands this down.
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
 * `data-full` is stamped the same way and for the same reason, rather than held
 * as state a render has to carry.
 *
 * @returns A callback ref to attach to the panel, beside the gesture's own.
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
}: PanelFitOptions): RefCallback<HTMLDivElement> {
	// The panel as state rather than a ref, for the reason the gesture holds it
	// that way: it is portalled and mounts on a later commit than the one that
	// opens the drawer, so an effect keyed on anything else runs with nothing to
	// observe.
	const [panel, setPanel] = useState<HTMLDivElement | null>(null)

	const ref = useCallback((node: HTMLDivElement | null) => setPanel(node), [])

	// Imperative `animate` runs outside any `MotionConfig`, so the preference is
	// read here rather than inherited (WCAG 2.3.3). The panel still resizes; it
	// just arrives rather than travels.
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

		// The height and the width the panel last rested at. Neither is known until
		// the observer delivers, and it delivers once for a newly observed element:
		// that first reading has no width to match, so it takes the reflow branch —
		// which is the one that adopts a size rather than travelling to it.
		let height = 0

		let width: number | null = null

		let travel: AnimationPlaybackControls | null = null

		/** Says whether the content has more to show than the panel can stand at. */
		const report = (at: number) =>
			panel.toggleAttribute('data-full', at >= ceilingOf(panel, window.innerHeight) - 1)

		/** Hands the box back to layout, which is what states the resting height. */
		const settle = () => {
			travel = null

			panel.style.height = ''

			// Delivers the box once by itself, which is the re-read a travel needs:
			// content swapped while the panel was pinned moved nothing observable, so
			// the height it now asks for is only knowable from here.
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

		const observer = new ResizeObserver(([entry]) => {
			const next = measureBox(panel, entry?.borderBoxSize?.[0])

			// A width change is the window being resized, and the height that comes
			// with it is layout reflowing rather than content changing. Adopting it as
			// the resting height leaves `move` with nowhere to travel: a panel that
			// eased after a window edge would trail the one the reader is holding.
			if (next.inline !== width) height = next.block

			width = next.inline

			move(next.block)
		})

		observer.observe(panel)

		return () => {
			// The pin stays where the last frame put it. A drag taking the height over
			// has already written its own by now, and clearing here would drop the
			// panel to its content mid-gesture.
			travel?.stop()

			observer.disconnect()
		}
	}, [panel, enabled, dragged, ceilingOf, transition, reduced])

	return ref
}
