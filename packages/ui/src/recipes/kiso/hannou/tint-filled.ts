/**
 * Hannou tint-filled: the hover / focus wash for a surface carrying a
 * translucent fill, where {@link tint} lands at the strength of the fill itself
 * and the hover only repaints the rest state. This doubles the `omote.bg.tint`
 * such a surface sits on — 10% zinc on light, 20% white on dark — so the hover
 * reads as a step out of the surface in each mode.
 *
 * Pair it with a fill. On bare ground it is merely a heavier {@link tint};
 * against `omote.bg.tint` it is the step that token cannot make. A surface with
 * a fill also needs no glass allowance, so this never carries the group-scoped
 * half `glassItem` adds — the caller emits one wash or the other, not both.
 *
 * Guarded against disabled and `data-disabled` descendants, like every wash here.
 *
 * Layer: kiso · Concern: hover/focus tint
 */

import { mode } from '../../../core/recipe'

export const tintFilled = mode(
	'not-disabled:not-data-disabled:hover:bg-zinc-950/10 not-disabled:not-data-disabled:focus:bg-zinc-950/10',
	'dark:not-disabled:not-data-disabled:hover:bg-white/20 dark:not-disabled:not-data-disabled:focus:bg-white/20',
)
