/**
 * Hannou glass-item: hover / focus highlight for items inside a glass
 * parent. Lives here as a state concern; the surface chrome that
 * triggers the cascade (`group-data-[glass]/glass`) lives in `omote`.
 *
 * Layer: kiso · Concern: glass-parent interaction state
 */

import { mode } from '../../../core/recipe'

export const glassItem = mode(
	'group-data-[glass]/glass:not-disabled:not-data-disabled:hover:bg-zinc-950/10 group-data-[glass]/glass:not-disabled:not-data-disabled:focus:bg-zinc-950/10',
	'dark:group-data-[glass]/glass:not-disabled:not-data-disabled:hover:bg-white/10 dark:group-data-[glass]/glass:not-disabled:not-data-disabled:focus:bg-white/10',
)
