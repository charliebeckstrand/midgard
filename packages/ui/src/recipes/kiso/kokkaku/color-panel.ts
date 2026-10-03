/**
 * Kokkaku skeleton: color-panel. The picker's overall block silhouette across
 * the three control size steps; chrome, sliders, and swatches collapse into one
 * placeholder rectangle. The box matches the panel at each step.
 *
 * `width` is the width of the real panel, and `max-w-full` keeps it inside a
 * narrow parent. The ColorPanel kata reads it. Each measure is a stepped
 * `density-*` class, so the silhouette takes the step of its nearest density
 * scope, as the picker does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: color-panel
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

const width = [dan.size.colorPanelWidth, 'max-w-full'] as const

export const colorPanel = {
	base: [rounded.lg, dan.size.colorPanelHeight, ...width],
	width,
	density: true,
} as const
