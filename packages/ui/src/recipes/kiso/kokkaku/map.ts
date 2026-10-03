/**
 * Kokkaku skeleton: map. Fills its container with the map's rounded frame;
 * canvas and chrome collapse into one placeholder rectangle. Where the
 * projection has an outline, the outline fills the container instead, as one
 * shape. The `aspect` forms take the full width, and an inline `aspect-ratio`
 * gives the height.
 *
 * Layer: kiso · Concern: skeleton form · Unit: map
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const map = {
	base: ['size-full', rounded.lg],
	outline: ['block', 'size-full'],
	aspect: ['w-full', 'h-auto', rounded.lg],
	outlineAspect: ['block', 'w-full', 'h-auto'],
} as const
