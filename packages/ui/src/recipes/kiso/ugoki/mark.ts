/**
 * Ugoki mark: the shared data-viz mark-reveal family — the timings charts,
 * sparklines, and maps draw their marks in with, so the three animating side
 * by side read as one motion family. Only timings at least two data-viz
 * surfaces share live here; each module composes its own reveals (slice sweep,
 * marker sequence, the reverse exit timings) in its timing spec, from the
 * tempo primitives its kata's `motion` re-exposes.
 *
 * Layer: kiso · Concern: data-viz mark reveals
 */

import { duration, ease } from './base'

/** Line / route stroke reveal (`pathLength` 0 → 1). */
const draw = { duration: duration[700], ease: ease.inOut } as const

/** Point-marker pop tempo; consumers hold it (`popHeld`) or stagger it. */
const pop = { duration: duration[250] } as const

export const mark = {
	draw,
	/** Area wash fade, trailing the draw so it fills in as the stroke crosses it. */
	fade: { duration: duration[500], delay: duration[150] },
	pop,
	/** The pop held until the draw has finished — the line's end-point landing. */
	popHeld: { ...pop, delay: draw.duration },
	/** Per-bar grow from the zero baseline. */
	grow: { duration: duration[400], ease: ease.out },
	/** Delay step between adjacent bars, so they rise in sequence. */
	stagger: 0.05,
} as const
