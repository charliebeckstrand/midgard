'use client'

import { useLayoutEffect, useState } from 'react'

/**
 * The custom properties on the root element that hold the frame, in pixels.
 *
 * A surface fixed to the viewport takes `top: var(--visual-viewport-top, 0px)`
 * and `height: var(--visual-viewport-height, 100%)`. The properties are set
 * only while the frame differs from the full layout viewport, so the fallbacks
 * hold everywhere else.
 */
const TOP = '--visual-viewport-top'

const HEIGHT = '--visual-viewport-height'

/** A scale past this is a pinch zoom, not a rounding error. */
const ZOOMED = 1.01

/** Two readings within a pixel of each other are the same reading. */
const SUBPIXEL = 1

/**
 * The box of the reading: an empty box fixed to the full layout viewport. A
 * surface with `position: fixed` resolves against the same box.
 */
const PROBE = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;contain:strict'

/** The part of a visual viewport that {@link visibleFrame} reads. @internal */
export type ViewportReading = Pick<VisualViewport, 'offsetTop' | 'height' | 'scale'>

/** The part of the screen that the reader sees, in the coordinates of a fixed box. */
export type VisibleFrame = {
	/** The distance from the top of the fixed box to the top of the frame, in pixels. */
	top: number
	/** The height of the frame, in pixels. */
	height: number
}

/**
 * The visible part of a box fixed to the layout viewport.
 *
 * Chrome on iOS lays the page out under its toolbars, and tells the page only
 * through the visual viewport how much of it they cover. A surface at
 * `bottom: 0` then sits behind the bottom toolbar. An iOS keyboard does the
 * same to a surface on the bottom edge. The frame is the part of the fixed box
 * that the visual viewport shows.
 *
 * Both readings are in client coordinates, which are the layout viewport's. The
 * visual viewport gives its own offset from that origin.
 *
 * @param box - The box of an element fixed to the full layout viewport.
 * @returns `null` when the frame is the full box, which is the case in most
 * browsers. It is also `null` for a pinch zoom: the zoom shows a part of the
 * page, and a surface keeps its place in the page.
 * @internal
 */
export function visibleFrame(
	box: Pick<DOMRectReadOnly, 'top' | 'height'>,
	viewport: ViewportReading,
): VisibleFrame | null {
	if (viewport.scale > ZOOMED) return null

	const top = Math.round(viewport.offsetTop - box.top)

	const height = Math.round(viewport.height)

	if (Math.abs(top) < SUBPIXEL && Math.abs(height - box.height) < SUBPIXEL) return null

	return { top, height }
}

// One reading for the whole page, however many surfaces hold it. Module scope,
// as `useScrollLock` keeps its count: every holder reads the same frame, and a
// second probe or a second set of listeners would measure it twice.
let holders = 0

let reading: VisibleFrame | null = null

let probe: HTMLDivElement | null = null

let stop: AbortController | null = null

let frame = 0

const listeners = new Set<(frame: VisibleFrame | null) => void>()

/** Tells whether two readings are the same. */
function same(a: VisibleFrame | null, b: VisibleFrame | null): boolean {
	return a === b || (a !== null && b !== null && a.top === b.top && a.height === b.height)
}

/** Reads the frame. On a change, it writes the properties and tells each holder. */
function measure(): void {
	frame = 0

	const viewport = window.visualViewport

	if (probe === null || !viewport) return

	const next = visibleFrame(probe.getBoundingClientRect(), viewport)

	if (same(next, reading)) return

	reading = next

	const root = document.documentElement.style

	if (next === null) {
		root.removeProperty(TOP)

		root.removeProperty(HEIGHT)
	} else {
		root.setProperty(TOP, `${next.top}px`)

		root.setProperty(HEIGHT, `${next.height}px`)
	}

	for (const listener of listeners) listener(next)
}

/** Reads the frame on the next frame, once for each frame however many events arrive. */
function schedule(): void {
	if (frame === 0) frame = requestAnimationFrame(measure)
}

/**
 * Puts the probe in the page, and reads the frame now and on each change.
 *
 * The scroll of the window is on the list, as well as the resizes. On Chrome
 * for iOS, a scroll can move the layout viewport and keep the visual viewport,
 * so a reading that waited for a resize would keep a frame that is gone.
 */
function start(): void {
	const viewport = window.visualViewport

	if (!viewport) return

	probe = document.createElement('div')

	probe.setAttribute('aria-hidden', 'true')

	probe.style.cssText = PROBE

	document.body.append(probe)

	stop = new AbortController()

	const { signal } = stop

	viewport.addEventListener('resize', schedule, { signal })

	viewport.addEventListener('scroll', schedule, { signal })

	window.addEventListener('resize', schedule, { signal })

	window.addEventListener('scroll', schedule, { signal, passive: true })

	// Now, not on a frame, so the first paint of the holder already has the frame.
	measure()
}

/** Takes the probe and the listeners away, and clears the properties. */
function end(): void {
	stop?.abort()

	stop = null

	if (frame !== 0) cancelAnimationFrame(frame)

	frame = 0

	probe?.remove()

	probe = null

	reading = null

	const root = document.documentElement.style

	root.removeProperty(TOP)

	root.removeProperty(HEIGHT)
}

/**
 * Holds the reading of the frame until the returned release runs. The first
 * holder starts it, and the last release ends it.
 *
 * The imperative form of {@link useVisualViewport}, for a holder whose life is
 * a DOM node rather than a component. A ref callback can return the release as
 * its cleanup.
 *
 * @param listener - Gets the frame now, and again on each change.
 * @returns The release. A second call does nothing.
 * @internal
 */
export function holdVisualViewport(listener?: (frame: VisibleFrame | null) => void): () => void {
	holders += 1

	if (holders === 1) start()

	if (listener !== undefined) {
		listeners.add(listener)

		listener(reading)
	}

	let held = true

	return () => {
		if (!held) return

		held = false

		if (listener !== undefined) listeners.delete(listener)

		holders -= 1

		if (holders === 0) end()
	}
}

/**
 * The part of the screen that the reader sees, as a box in the coordinates of a
 * fixed surface. Use it in a surface that docks to an edge of the viewport with
 * `position: fixed`.
 *
 * While a component holds it, the root element carries the frame as the
 * `--visual-viewport-top` and `--visual-viewport-height` custom properties. Fix
 * the surface to that box with `top: var(--visual-viewport-top, 0px)` and
 * `height: var(--visual-viewport-height, 100%)`, in place of `inset: 0`. A
 * surface at the bottom of the box then stays above a browser toolbar and above
 * an iOS keyboard. `Overlay` holds it already, and its root is the box, so a
 * panel in an overlay needs nothing more.
 *
 * @remarks
 * Chrome on iOS lays the page out under its toolbars, and shows the covered
 * part only through the visual viewport. `env(safe-area-inset-bottom)` does
 * not include a toolbar, and the viewport units can be stale on the first
 * load. The visual viewport is the one reading that agrees with the screen.
 *
 * The properties are set only while the frame differs from the full layout
 * viewport, so most browsers keep the fallbacks. A pinch zoom also keeps them:
 * the zoom shows a part of the page, and a surface keeps its place in the page.
 *
 * All holders share one reading. It updates once for each frame on a resize or
 * a scroll, and stops when the last holder unmounts.
 *
 * @param enabled - Whether to hold the reading, `true` when omitted. A surface
 * scoped to a container has no browser toolbar over it.
 * @returns The frame, or `null` while it is the full layout viewport or not held.
 */
export function useVisualViewport(enabled = true): VisibleFrame | null {
	const [visible, setVisible] = useState<VisibleFrame | null>(null)

	// A layout effect, so the properties are set before the first paint of the
	// holder. A passive effect paints the surface under the toolbar for one frame,
	// and then moves it up.
	useLayoutEffect(() => {
		if (!enabled) return

		return holdVisualViewport(setVisible)
	}, [enabled])

	return enabled ? visible : null
}
