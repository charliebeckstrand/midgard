/**
 * Kokkaku skeleton — textarea. Fills width; height comes from the
 * caller (textarea's intrinsic min-height).
 *
 * Layer: kiso · Concern: skeleton form · Unit: textarea
 */

import { kasane } from '../kasane'

export const textarea = {
	base: ['w-full', kasane.rounded.lg],
} as const
