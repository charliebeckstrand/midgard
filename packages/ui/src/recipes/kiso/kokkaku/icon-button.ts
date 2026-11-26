/**
 * Kokkaku skeleton: icon-button. Square silhouette of the icon-only
 * bare button: icon dimension plus padding floor per size step.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the button does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: icon-button
 */

import { dan } from '../dan'

export const iconButton = {
	base: [dan.radius.button, dan.size.button.icon],
	density: true,
} as const
