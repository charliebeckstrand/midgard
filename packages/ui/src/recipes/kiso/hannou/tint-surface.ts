/**
 * Hannou tint-surface: the hover / focus wash for an opaque surface — a card, a
 * row on `omote.bg.surface`.
 *
 * Opaque, where every other wash here is an alpha. A background is replaced, not
 * layered. A translucent wash over `bg-white` / `dark:bg-zinc-900` does not
 * darken the card, it *removes* it. Whatever the card was covering then shows
 * through for as long as the pointer rests on it. So this steps the surface to
 * a nearby shade instead: `zinc-100` on light, one stop off `zinc-900` on dark.
 * The surface stays a surface. On light, `zinc-50` is too near white to see: the
 * contrast is about 1.04:1. `zinc-100` gives about 1.1:1, near the dark step.
 *
 * A surface needs no glass allowance either, so this never carries the
 * group-scoped half `glassItem` adds; the caller emits one wash or the other.
 *
 * Guarded against a disabled or `data-disabled` element, like the other hover washes here.
 *
 * Layer: kiso · Concern: hover/focus tint
 */

import { mode } from '../../../core/recipe'

export const tintSurface = mode(
	'not-disabled:not-data-disabled:hover:bg-zinc-100 not-disabled:not-data-disabled:focus:bg-zinc-100',
	'dark:not-disabled:not-data-disabled:hover:bg-zinc-800 dark:not-disabled:not-data-disabled:focus:bg-zinc-800',
)
