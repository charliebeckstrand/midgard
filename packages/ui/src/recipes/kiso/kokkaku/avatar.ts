/**
 * Kokkaku skeleton: avatar. Rounded-full silhouette in the avatar ramp, so the
 * silhouette takes the step of its nearest density scope, as the avatar does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: avatar
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const avatar = {
	base: [rounded.full, dan.size.avatar.base],
	density: true,
	// Inline-level, as the `inline-grid` avatar is, so the silhouette flows where the avatar would.
	inline: true,
} as const
