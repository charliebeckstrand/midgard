/**
 * Kokkaku skeleton: badge. Pill silhouette across the four badge size
 * steps. Each step is a `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the badge does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: badge
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const badge = {
	base: [rounded.md, dan.size.badge.base, dan.size.badge.width],
	density: true,
	// Inline-level, as the `inline-flex` badge is, so the silhouette flows where the badge would.
	inline: true,
} as const
