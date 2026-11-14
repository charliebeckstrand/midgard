/**
 * Ugoki glide: the tween of a box that moves to a new slot in a layout, such as
 * a dashboard tile that a re-pack puts in a new cell. The box starts fast and
 * settles softly into the slot.
 *
 * Layer: kiso · Concern: layout glide
 */

import { duration, ease } from './base'

export const glide = { duration: duration[200], ease: ease.settle } as const
