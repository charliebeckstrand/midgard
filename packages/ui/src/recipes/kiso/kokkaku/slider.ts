/**
 * Kokkaku skeleton: slider. A track-height line filling its parent;
 * vertical margins reserve the hit-area box the real slider pads around
 * the track.
 *
 * `track` is the height of the real track of RangeSlider. The RangeSlider kata
 * reads it. Each measure is a stepped `density-*` class, so the silhouette takes
 * the step of its nearest density scope, as the slider does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: slider
 */

import { kasane } from '../kasane'

const { rounded } = kasane

const track = 'density-h-[1,1.5,2]'

export const slider = {
	base: ['w-full', rounded.full, track, 'density-my-[3,4,5]'],
	track,
	density: true,
} as const
