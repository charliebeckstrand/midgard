/**
 * Kokkaku skeleton: slider. A track-height line filling its parent;
 * vertical margins reserve the hit-area box the real slider pads around
 * the track.
 *
 * Layer: kiso · Concern: skeleton form · Unit: slider
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const slider = {
	base: ['w-full', rounded.full],
	size: {
		sm: 'h-1 my-3',
		md: 'h-1.5 my-4',
		lg: 'h-2 my-5',
	},
	defaults: { size: 'md' as const },
} as const
