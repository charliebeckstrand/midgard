/**
 * Panel archetype: surface. The fill, chrome, and combined base used by
 * dialog, drawer, and sheet panel bodies. Three shapes: fill only,
 * chrome only (ring + forced-colour outline), and fill + chrome combined.
 *
 * Layer: kiso · Archetype: panel · Concern: surface
 */

import { omote } from '../omote'
import { sen } from '../sen'

const { bg } = omote
const { ring, forced } = sen

export const surface = {
	/** Background fill only. */
	bg: bg.surface,
	/** Chrome only: ring + shadow + forced-colour outline, no fill. */
	chrome: [ring.default, forced.outline],
	/** Fill + chrome, everything a floating panel needs. */
	base: [ring.default, forced.outline, ...bg.surface],
} as const
