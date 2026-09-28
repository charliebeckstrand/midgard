/**
 * Kokkaku skeleton: slider. A track-height line filling its parent;
 * vertical margins reserve the hit-area box the real slider pads around
 * the track.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the slider does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: slider
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const slider = {
	base: ['w-full', rounded.full, 'density-h-[1,1.5,2]', 'density-my-[3,4,5]'],
	density: true,
} as const
