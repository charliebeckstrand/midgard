/**
 * Control archetype: surface vocabulary. `default` paints a solid surface,
 * `glass` is transparent + blurred for nested-in-overlay contexts. The
 * `outline` variant has no fill here; its kata layer their own borders. The check-input branch reuses the same
 * shape via `kiso/control/check.ts`.
 *
 * Layer: kiso · Archetype: control · Concern: surface
 */

import { mode } from '../../../core/recipe'
import { omote } from '../omote'

const { glass } = omote

export const surface = {
	default: mode(
		['bg-white', 'has-[>:disabled]:before:bg-zinc-950/5'],
		['dark:bg-white/5', 'dark:before:hidden'],
	),
	glass,
} as const
