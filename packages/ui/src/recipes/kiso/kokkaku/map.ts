/**
 * Kokkaku skeleton: map. Fills its container with the map's rounded frame;
 * canvas and chrome collapse into one placeholder rectangle. Where the
 * projection has an outline, the outline fills the container instead, as one
 * shape.
 *
 * Layer: kiso · Concern: skeleton form · Unit: map
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const map = {
	base: ['size-full', rounded.lg],
	outline: ['block', 'size-full'],
} as const
