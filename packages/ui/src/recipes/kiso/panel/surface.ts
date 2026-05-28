/**
 * Panel archetype — surface. The fill, chrome, and combined base used by
 * dialog, drawer, and sheet panel bodies. Separated into three shapes so
 * a kata can take the chrome (ring + forced-colour outline) without the
 * fill, or the fill without the chrome.
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
	/** Chrome only — ring + shadow + forced-colour outline, no fill. */
	chrome: [ring.default, forced.outline],
	/** Fill + chrome, everything a floating panel needs. */
	base: [ring.default, forced.outline, ...bg.surface],
} as const
