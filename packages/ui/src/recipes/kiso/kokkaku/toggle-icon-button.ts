/**
 * Kokkaku skeleton: toggle-icon-button. Square silhouette of the
 * icon-only bare button: icon dimension plus padding floor per size
 * step.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the button does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: toggle-icon-button
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const toggleIconButton = {
	base: [rounded.lg, dan.size.button.icon],
	density: true,
} as const
