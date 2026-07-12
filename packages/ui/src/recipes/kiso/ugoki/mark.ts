/**
 * Ugoki mark: the shared data-viz mark-reveal family — the timings charts,
 * sparklines, and maps draw their marks in with, so the three animating side
 * by side read as one motion family. Only timings at least two data-viz
 * surfaces share live here; each module composes its own reveals (slice sweep,
 * marker sequence, the reverse exit timings) from `base` in its timing spec.
 *
 * Layer: kiso · Concern: data-viz mark reveals
 */

import { duration, ease } from './base'

/** Line / route stroke reveal (`pathLength` 0 → 1). */
const draw = { duration: duration[700], ease: ease.inOut } as const

export const mark = {
	draw,
	/** Area wash fade, trailing the draw so it fills in as the stroke crosses it. */
	fade: { duration: duration[500], delay: duration[150] },
	/** Point-marker pop, held until the draw has finished. */
	pop: { duration: duration[250], delay: draw.duration },
	/** Per-bar grow from the zero baseline. */
	grow: { duration: duration[400], ease: ease.out },
	/** Delay step between adjacent bars, so they rise in sequence. */
	stagger: 0.05,
} as const
