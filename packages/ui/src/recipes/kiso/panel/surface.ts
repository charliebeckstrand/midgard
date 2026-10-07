/**
 * Panel archetype: surface. The fill, chrome, and combined base used by
 * dialog, drawer, sheet, box, and grid. Three shapes: fill only,
 * chrome only (ring + forced-color outline), and fill + chrome combined. And
 * `axis`, the `surface` variant axis of the dialog, drawer, and sheet panels.
 *
 * Layer: kiso · Archetype: panel · Concern: surface
 */

import { omote } from '../omote'
import { sen } from '../sen'

const { bg, glass } = omote
const { ring, forced } = sen

export const surface = {
	/** Background fill only. */
	bg: bg.surface,
	/** Chrome only: ring + forced-color outline, no fill. */
	chrome: [ring.default, forced.outline],
	/** Fill + chrome, everything a floating panel needs. */
	base: [ring.default, forced.outline, ...bg.surface],
	/** The `surface` axis of a modal panel: `flat` is opaque, and `glass` is translucent and blurred. */
	axis: { glass, flat: bg.surface },
} as const
