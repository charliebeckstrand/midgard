/**
 * Control archetype — surface vocabulary. `default` paints a solid surface,
 * `outline` layers a border without a fill, `glass` is transparent + blurred
 * for nested-in-overlay contexts. The check-input branch reuses the same
 * shape via `kiso/control/check.ts`.
 *
 * Layer: kiso · Archetype: control · Concern: surface
 */

import { mode } from '../../../core/recipe'
import { omote } from '../omote'
import { sen } from '../sen'

export const surface = {
	default: mode(
		['bg-white', 'has-[>:disabled]:before:bg-zinc-950/5'],
		['dark:bg-white/5', 'dark:before:hidden'],
	),
	outline: [...sen.borderEmphasis, 'hover:border-zinc-950/30 dark:hover:border-white/30'],
	glass: omote.glass,
} as const
