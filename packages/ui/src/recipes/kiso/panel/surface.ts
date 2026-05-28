/**
 * Panel archetype — surface. The fill, chrome, and combined base used by
 * dialog, drawer, and sheet panel bodies. Separated into three shapes so
 * a kata can take the chrome (ring + forced-colour outline) without the
 * fill, or the fill without the chrome.
 *
 * Layer: kiso · Archetype: panel · Concern: surface
 */

import { mode } from '../../../core/recipe'
import { sen } from '../sen'

const bg = mode('bg-white', 'dark:bg-zinc-900')

export const surface = {
	/** Background fill only. */
	bg,
	/** Chrome only — ring + shadow + forced-colour outline, no fill. */
	chrome: [sen.ring, sen.forced.outline],
	/** Fill + chrome, everything a floating panel needs. */
	base: [sen.ring, sen.forced.outline, bg],
}
