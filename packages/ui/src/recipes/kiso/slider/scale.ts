/**
 * Slider archetype: size scale. `<Slider />` and `<RangeSlider />` share it:
 * the steps of their padding, track, and thumb.
 *
 * Layer: kiso · Archetype: slider · Concern: scale
 */

import { defineScale } from '../../../core/density'
import { dan } from '../dan'

export const scale = defineScale(
	dan.space.slider.y,
	dan.size.slider.track,
	dan.space.slider.track.y,
	dan.size.thumb.base,
)
