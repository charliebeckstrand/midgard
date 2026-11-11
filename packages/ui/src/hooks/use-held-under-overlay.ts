'use client'

import { type RefObject, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { isUnderEnteringOverlay, subscribeOverlayLayers } from '../utilities/overlay-layers'

/**
 * Holds a value of a mark on the page, such as the selection of a Map, while
 * the backdrop of an overlay that covers the mark fades in. The new value
 * shows once the backdrop arrives.
 *
 * @remarks A pick that opens a Dialog changes the selection in the commit of
 * the open. The backdrop starts clear, so without the hold the new ring paints
 * at full contrast in the first frames, and then the backdrop dims it. The
 * mark looks as if it blinks.
 *
 * The hold reads the events of the overlay, not a time. The overlay records
 * its fade in a layout effect of the commit that opens it. The value thus
 * changes only after the layout effects of its commit, which costs one more
 * render before the paint. Where no overlay fades in, the change paints in the
 * same frame. A value that was already on the page stays as it is when an
 * overlay opens over it, and a change after the arrival or after a close shows
 * at once.
 *
 * The overlay must open in the same commit as the change. An overlay that
 * opens in a later commit, such as one that waits for its module to load,
 * holds nothing.
 *
 * @param value - The value of the mark. A change of identity is a change.
 * @param ref - An element of the mark, which tells which overlays cover it.
 * @returns The value to show.
 * @internal
 */
export function useHeldUnderOverlay<T>(value: T, ref: RefObject<Element | null>): T {
	const covered = useSyncExternalStore(
		subscribeOverlayLayers,
		() => ref.current !== null && isUnderEnteringOverlay(ref.current),
		() => false,
	)

	// The value of the last commit. A value that differs from it is new in this
	// render, before the overlay of its commit could record its fade.
	const [committed, setCommitted] = useState(value)

	// The value on the page.
	const [shown, setShown] = useState(value)

	const settles = !covered && Object.is(value, committed)

	if (settles && !Object.is(shown, value)) setShown(value)

	useLayoutEffect(() => {
		setCommitted(value)
	}, [value])

	return settles ? value : shown
}
