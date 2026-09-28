/**
 * Kokkaku skeleton: calendar. One block silhouette per width step; the
 * height approximates the header row above the seven square weekday/day
 * rows at that width.
 *
 * `width` is the width of the real calendar. The Calendar kata reads it. Each
 * measure is a stepped `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the calendar does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: calendar
 */

import { kasane } from '../kasane'

const { rounded } = kasane

const width = 'density-w-[52,68,80]'

export const calendar = {
	base: [rounded.lg, 'density-h-[60,78,92]', width],
	width,
	density: true,
} as const
