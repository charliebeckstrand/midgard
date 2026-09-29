/**
 * Kokkaku skeleton: avatar. Rounded-full silhouette sized by the
 * standard avatar dimension scale.
 *
 * Layer: kiso · Concern: skeleton form · Unit: avatar
 */

import { kasane } from '../kasane'
import { shaku } from '../shaku'

const { rounded } = kasane

export const avatar = {
	base: rounded.full,
	size: shaku.avatar,
	// Inline-level, as the `inline-grid` avatar is, so the silhouette flows where the avatar would.
	inline: true,
} as const
