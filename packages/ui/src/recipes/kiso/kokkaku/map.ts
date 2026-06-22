/**
 * Kokkaku skeleton: map. Fills its container with the map's rounded frame;
 * canvas and chrome collapse into one placeholder rectangle.
 *
 * Layer: kiso · Concern: skeleton form · Unit: map
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const map = {
	base: ['size-full', rounded.lg],
} as const
