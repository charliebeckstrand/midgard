/**
 * Omote panel: the surface of a panel. Two shapes: chrome only (ring +
 * forced-color outline), and fill + chrome combined. And `axis`, the `surface`
 * axis of a modal panel.
 *
 * Layer: kiso · Concern: panel surface
 */

import { ring } from '../sen/ring'
import { bg } from './bg'
import { glass } from './glass'

export const panel = {
	/** Chrome only: ring + forced-color outline, no fill. */
	chrome: ring.default,
	/** Fill + chrome, everything a floating panel needs. */
	base: [...ring.default, ...bg.surface],
	/** The `surface` axis of a modal panel: `flat` is opaque, and `glass` is translucent and blurred. */
	axis: { glass, flat: bg.surface },
} as const
