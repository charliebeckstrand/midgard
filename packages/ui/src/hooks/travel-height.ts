'use client'

import { type AnimationPlaybackControls, animate, type ValueAnimationTransition } from 'motion'

/**
 * Carries an element's height from where it stands to where its content now
 * asks for, and hands the box back to layout on arrival.
 *
 * CSS cannot do it. `height` interpolates between two lengths and a box sized by
 * its content has only one, so a box handed new content snaps to it. The two
 * lengths are the caller's to measure — only the caller knows what its own box
 * rested at before layout reflowed — and this carries the element between them.
 *
 * The pin is written straight to the element rather than through a render,
 * which is what makes the origin reachable at all: a `ResizeObserver` callback
 * lands after layout and before paint, so a pin written from one reaches no
 * frame of its own, and a render that owned the in-flight height would stamp the
 * resting value back over it.
 *
 * The inline height is cleared on arrival, so the resting size goes back to
 * being CSS's — which is what lets the cap a class states keep bounding the box,
 * with no length restated here. It is deliberately *not* cleared when the caller
 * stops the returned controls: an interrupted travel leaves the box where the
 * last frame put it, which is what a caller handing the height to something else
 * needs.
 *
 * @param from The height the element rested at, which is the one the reader saw.
 * @param to The height its content now asks for.
 * @param onSettle Runs once the box is back with layout, for a caller that has
 * to re-read it. Never runs for a travel the caller stopped.
 * @returns The travel, for a caller that has to stop or replace it.
 * @internal
 */
export function travelHeight(
	element: HTMLElement,
	from: number,
	to: number,
	transition: ValueAnimationTransition<number>,
	onSettle?: () => void,
): AnimationPlaybackControls {
	element.style.height = `${from}px`

	return animate(from, to, {
		...transition,
		onUpdate: (at) => {
			element.style.height = `${at}px`
		},
		onComplete: () => {
			element.style.height = ''

			onSettle?.()
		},
	})
}
