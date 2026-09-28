/**
 * Kokkaku skeleton: calendar. One block silhouette per width step; the
 * height approximates the header row above the seven square weekday/day
 * rows at that width.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the calendar does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: calendar
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const calendar = {
	base: [rounded.lg, 'density-h-[60,78,92]', 'density-w-[52,68,80]'],
	density: true,
} as const
