/**
 * Kokkaku skeleton: slider. A track-height line filling its parent;
 * vertical margins reserve the hit-area box the real slider pads around
 * the track.
 *
 * The line is the height of the real track of RangeSlider (`dan.size.slider.track`).
 * Each measure is a stepped `density-*` class, so the silhouette takes
 * the step of its nearest density scope, as the slider does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: slider
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const slider = {
	base: ['w-full', rounded.full, dan.size.slider.track, dan.space.slider.track.y],
	density: true,
} as const
