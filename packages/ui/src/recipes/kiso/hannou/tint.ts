/**
 * Hannou tint: mode-neutral hover/focus background wash on the active
 * surface. Light at 5% zinc, dark at 5% white. Guarded against disabled
 * and `data-disabled` descendants. Consumed by the menu/option item
 * chrome (`hannou.item`) and any kata that wants the same wash.
 *
 * Layer: kiso · Concern: hover/focus tint
 */

import { mode } from '../../../core/recipe'

export const tint = mode(
	'not-disabled:not-data-disabled:hover:bg-zinc-950/5 not-disabled:not-data-disabled:focus:bg-zinc-950/5',
	'dark:not-disabled:not-data-disabled:hover:bg-white/5 dark:not-disabled:not-data-disabled:focus:bg-white/5',
)
