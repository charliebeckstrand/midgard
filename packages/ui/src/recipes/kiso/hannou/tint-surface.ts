/**
 * Hannou tint-surface: the hover / focus wash for an opaque surface — a card, a
 * row on `omote.bg.surface`.
 *
 * Opaque, where every other wash here is an alpha. A background is replaced, not
 * layered: a translucent wash over `bg-white` / `dark:bg-zinc-900` does not
 * darken the card, it *removes* it, and whatever the card was covering shows
 * through for as long as the pointer rests on it. So this steps the surface to
 * its neighbouring shade instead — one stop off white on light, one stop off
 * zinc-900 on dark — and the surface stays a surface.
 *
 * A surface needs no glass allowance either, so this never carries the
 * group-scoped half `glassItem` adds; the caller emits one wash or the other.
 *
 * Guarded against disabled and `data-disabled` descendants, like every wash here.
 *
 * Layer: kiso · Concern: hover/focus tint
 */

import { mode } from '../../../core/recipe'

export const tintSurface = mode(
	'not-disabled:not-data-disabled:hover:bg-zinc-50 not-disabled:not-data-disabled:focus:bg-zinc-50',
	'dark:not-disabled:not-data-disabled:hover:bg-zinc-800 dark:not-disabled:not-data-disabled:focus:bg-zinc-800',
)
