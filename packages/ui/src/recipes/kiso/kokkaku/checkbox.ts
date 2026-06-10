/**
 * Kokkaku skeleton: checkbox. Fixed 4.5-square box silhouette with the
 * subtle rounded corners of the real control.
 *
 * Layer: kiso · Concern: skeleton form · Unit: checkbox
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const checkbox = {
	base: ['size-4.5', rounded.sm],
} as const
