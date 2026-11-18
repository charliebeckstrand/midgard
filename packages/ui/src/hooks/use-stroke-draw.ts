'use client'

import { type MotionValue, useMotionValue, useTransform } from 'motion/react'

/** The `style` of a stroke that draws itself. @internal */
export type StrokeDraw = {
	/** The drawn share of the stroke, from 0 to 1. A `pathLength` target drives it. */
	pathLength: MotionValue<number>
	/** The opacity of the stroke: 1 while a part of it is drawn, and 0 at zero length. */
	opacity: MotionValue<number>
}

/**
 * The `style` of a stroke that draws itself along its own length
 * (`pathLength`). Give it to the `style` of the `m.path`. A `pathLength` target
 * in `animate` or `exit` then drives the drawn share. The stroke paints nothing
 * at zero length.
 *
 * @remarks Motion draws a stroke by its dash. It sets `pathLength` to 1 and
 * writes the dash array as `<drawn> 1`. At zero, the pattern starts a new dash
 * exactly at the end of the path. A zero-length dash under a round cap paints a
 * dot, so the stroke paints a dot at each end. A draw that holds at zero shows
 * the far end before the stroke gets to it. An un-draw ends on this frame, and
 * the presence removes the path only after the frame paints. The opacity
 * therefore follows the drawn share, and not a timer beside it. The two change
 * in the same frame.
 *
 * @param still - Mount the stroke whole: the reader asks for reduced motion, or
 * the render is on the server or is the hydration render.
 * @returns The motion values for the `style` of the path.
 * @internal
 */
export function useStrokeDraw(still: boolean): StrokeDraw {
	const pathLength = useMotionValue(still ? 1 : 0)

	const opacity = useTransform(pathLength, (share): number => (share > 0 ? 1 : 0))

	return { pathLength, opacity }
}
