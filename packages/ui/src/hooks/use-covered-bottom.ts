'use client'

import { useLayoutEffect, useState } from 'react'

/**
 * The custom property on the root element that holds the strip, in pixels.
 *
 * A surface on the bottom edge pads by `var(--covered-bottom, 0px)`. The
 * property is set only while the strip is more than zero, so the fallback holds
 * everywhere else.
 */
const PROPERTY = '--covered-bottom'

/**
 * The largest share of the frame that a browser toolbar covers. A taller strip
 * is a keyboard.
 *
 * A toolbar is a tenth of a phone screen or less, and a keyboard is a third or
 * more. `useKeyboardSettled` draws the same line. A keyboard is not a toolbar
 * to pad over: a surface then stays where it is, as it did before this hook.
 */
const TOOLBAR = 0.15

/** A scale past this is a pinch zoom, not a rounding error. */
const ZOOMED = 1.01

/** Two readings within a pixel of each other are the same reading. */
const SUBPIXEL = 1

/**
 * The frame of the reading: an empty box fixed to the full layout viewport.
 * Its bottom is where `bottom: 0` places a fixed surface.
 */
const PROBE = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;contain:strict'

/** The part of a visual viewport that {@link coveredBottom} reads. @internal */
export type ViewportReading = Pick<VisualViewport, 'offsetTop' | 'height' | 'scale'>

/**
 * How far the bottom of a fixed frame runs past the bottom of the visual
 * viewport, in pixels.
 *
 * A browser toolbar that covers the page does that. Chrome on iOS is the case in
 * view. On the first load, it places `position: fixed` against a layout
 * viewport that runs under its bottom toolbar, until the first scroll. A
 * surface at `bottom: 0` then sits behind the toolbar.
 *
 * Both edges are in client coordinates, which are the layout viewport's. The
 * visual viewport gives its own offset from that origin.
 *
 * @param frame - The box of a frame fixed to the full layout viewport.
 * @returns `0` when nothing covers the frame. It is also `0` for a pinch zoom,
 * and for a strip as tall as a keyboard.
 * @internal
 */
export function coveredBottom(
	frame: Pick<DOMRectReadOnly, 'bottom' | 'height'>,
	viewport: ViewportReading,
): number {
	// A pinch zoom shows a part of the page, so the visual viewport stops short of
	// each edge. Nothing covers the page there.
	if (viewport.scale > ZOOMED) return 0

	const covered = frame.bottom - (viewport.offsetTop + viewport.height)

	if (covered < SUBPIXEL || covered > frame.height * TOOLBAR) return 0

	return Math.round(covered)
}

// One reading for the whole page, however many surfaces hold it. Module scope,
// as `useScrollLock` keeps its count: every holder reads the same strip, and a
// second probe or a second set of listeners would measure it twice.
let holders = 0

let reading = 0

let probe: HTMLDivElement | null = null

let stop: AbortController | null = null

let frame = 0

const listeners = new Set<(covered: number) => void>()

/** Reads the strip. On a change, it writes the property and tells each holder. */
function measure(): void {
	frame = 0

	const viewport = window.visualViewport

	if (probe === null || !viewport) return

	const next = coveredBottom(probe.getBoundingClientRect(), viewport)

	if (next === reading) return

	reading = next

	const root = document.documentElement.style

	if (next === 0) root.removeProperty(PROPERTY)
	else root.setProperty(PROPERTY, `${next}px`)

	for (const listener of listeners) listener(next)
}

/** Reads the strip on the next frame, once for each frame however many events arrive. */
function schedule(): void {
	if (frame === 0) frame = requestAnimationFrame(measure)
}

/**
 * Puts the probe in the page, and reads the strip now and on each change.
 *
 * The scroll of the window is on the list, as well as the resizes. On Chrome
 * for iOS, the first scroll corrects the layout viewport, and the visual
 * viewport can keep its size. A reading that waited for a resize would then
 * keep a strip that is gone.
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

	// Now, not on a frame, so the first paint of the holder already has the strip.
	measure()
}

/** Takes the probe and the listeners away, and clears the property. */
function end(): void {
	stop?.abort()

	stop = null

	if (frame !== 0) cancelAnimationFrame(frame)

	frame = 0

	probe?.remove()

	probe = null

	reading = 0

	document.documentElement.style.removeProperty(PROPERTY)
}

/**
 * Holds the reading of the strip until the returned release runs. The first
 * holder starts it, and the last release ends it.
 *
 * The imperative form of {@link useCoveredBottom}, for a holder whose life is a
 * DOM node rather than a component. A ref callback can return the release as
 * its cleanup.
 *
 * @param listener - Gets the strip now, and again on each change.
 * @returns The release. A second call does nothing.
 * @internal
 */
export function holdCoveredBottom(listener?: (covered: number) => void): () => void {
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
 * The strip at the bottom of the screen that a browser toolbar covers, in pixels.
 * Use it in a surface that docks to the bottom edge with `position: fixed`.
 *
 * While a component holds it, the root element carries the strip as the
 * `--covered-bottom` custom property. Pad the content of the surface by
 * `max(env(safe-area-inset-bottom), var(--covered-bottom, 0px))`. The
 * background then stays under the toolbar, and the content stays above it.
 * `Overlay` holds it already, so a surface in an overlay needs only the padding.
 *
 * @remarks
 * Chrome on iOS can place `position: fixed` against a layout viewport that runs
 * under its bottom toolbar, until the first scroll. A surface at `bottom: 0`
 * then sits behind the toolbar. The strip is the part of an empty fixed frame
 * that is under the bottom of the visual viewport, so it is zero wherever
 * `bottom: 0` is already correct. That includes the state with the toolbar
 * hidden. A pinch zoom, and a strip as tall as a keyboard, read as zero too.
 *
 * All holders share one reading. It updates once for each frame on a resize or
 * a scroll, and stops when the last holder unmounts.
 *
 * @param enabled - Whether to hold the reading, `true` when omitted. A surface
 * scoped to a container has no browser toolbar over it.
 * @returns The strip in pixels, or `0` while not held.
 */
export function useCoveredBottom(enabled = true): number {
	const [covered, setCovered] = useState(0)

	// A layout effect, so the property is set before the first paint of the
	// holder. A passive effect paints the surface under the toolbar for one frame,
	// and then moves its content up.
	useLayoutEffect(() => {
		if (!enabled) return

		return holdCoveredBottom(setCovered)
	}, [enabled])

	return enabled ? covered : 0
}
