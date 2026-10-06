/**
 * Ugoki glide: the tween of a box that moves to a new slot in a layout, such as
 * a dashboard tile that a re-pack puts in a new cell. The box starts fast and
 * settles softly into the slot.
 *
 * Layer: kiso · Concern: layout glide
 */

import { duration } from './base'

/** A quick start that settles softly, with no overshoot past the slot. */
const settle = [0.22, 1, 0.36, 1] as const

export const glide = { duration: duration[200], ease: settle } as const
