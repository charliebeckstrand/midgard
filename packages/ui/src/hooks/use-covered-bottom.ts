'use client'

import { type RefCallback, useCallback, useLayoutEffect, useState } from 'react'

/**
 * The largest share of the frame that browser chrome covers. A taller strip is
 * a keyboard.
 *
 * A toolbar is a tenth of a phone screen or less, and a keyboard is a third or
 * more. `useKeyboardSettled` draws the same line. A keyboard is not chrome to
 * pad over: the panel then stays where it is, as it did before this hook.
 */
const CHROME = 0.15

/** A scale past this is a pinch zoom, not a rounding error. */
const ZOOMED = 1.01

/** Two readings within a pixel of each other are the same reading. */
const SUBPIXEL = 1

/** The part of a visual viewport that {@link coveredBottom} reads. @internal */
export type ViewportReading = Pick<VisualViewport, 'offsetTop' | 'height' | 'scale'>

/**
 * How far the bottom of a fixed frame runs past the bottom of the visual
 * viewport, in pixels.
 *
 * Browser chrome that covers the page does that. Chrome on iOS is the case in
 * view. On the first load, it places `position: fixed` against a layout
 * viewport that runs under its bottom toolbar, until the first scroll. A panel
 * at `bottom: 0` then sits behind the toolbar.
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

	if (covered < SUBPIXEL || covered > frame.height * CHROME) return 0

	return Math.round(covered)
}

/** What {@link useCoveredBottom} hands back. @internal */
export type CoveredBottom = {
	/** Goes on a frame fixed to the full layout viewport, such as an overlay root. */
	ref: RefCallback<HTMLElement>
	/** The pixels of the frame that the browser covers at the bottom. See {@link coveredBottom}. */
	covered: number
}

/**
 * The strip at the bottom of the screen that browser chrome covers, for a panel
 * docked to that edge.
 *
 * The frame is measured, not the window. The frame is the box that `position:
 * fixed` really uses, so the reading holds whichever viewport value a browser
 * gets wrong. The reading is taken before the first paint, and again on each
 * resize of the window or the visual viewport.
 *
 * @param enabled - Whether the frame is fixed to the layout viewport. A frame
 * scoped to a container has no browser chrome over it.
 * @internal
 */
export function useCoveredBottom(enabled: boolean): CoveredBottom {
	// The frame as state rather than a ref, for the reason `usePanelResize` holds
	// its panel that way. It is portaled, and it mounts on a later commit than the
	// one that opens it.
	const [frame, setFrame] = useState<HTMLElement | null>(null)

	const ref = useCallback((node: HTMLElement | null) => setFrame(node), [])

	const [covered, setCovered] = useState(0)

	// A layout effect, so the first paint of the panel already has its padding.
	// A passive effect paints the panel under the toolbar for one frame, and then
	// moves its content up.
	useLayoutEffect(() => {
		const viewport = window.visualViewport

		if (!enabled || frame === null || !viewport) return

		const measure = () => setCovered(coveredBottom(frame.getBoundingClientRect(), viewport))

		measure()

		const controller = new AbortController()

		const { signal } = controller

		viewport.addEventListener('resize', measure, { signal })

		viewport.addEventListener('scroll', measure, { signal })

		window.addEventListener('resize', measure, { signal })

		return () => controller.abort()
	}, [enabled, frame])

	return { ref, covered: enabled ? covered : 0 }
}
