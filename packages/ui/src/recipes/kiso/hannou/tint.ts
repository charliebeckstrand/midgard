/**
 * Hannou tint: the hover and focus washes. `base` is the mode-neutral wash on
 * the active surface: 5% zinc on light, 5% white on dark. The menu and option
 * item chrome (`hannou.item`) reads it, and so does any kata that wants the
 * same wash. The other entries are its forms for other grounds. Each wash is
 * guarded against a disabled or `data-disabled` element.
 *
 * Layer: kiso · Concern: hover/focus tint
 */

import { mode } from '../../../core/recipe'

export const tint = {
	/** Mode-neutral wash on the active surface. */
	base: mode(
		'not-disabled:not-data-disabled:hover:bg-zinc-950/5 not-disabled:not-data-disabled:focus:bg-zinc-950/5',
		'dark:not-disabled:not-data-disabled:hover:bg-white/5 dark:not-disabled:not-data-disabled:focus:bg-white/5',
	),
	/**
	 * `base` on the `::before` layer, not on the element. Use it where the
	 * element keeps square corners and a rounded inner layer carries the wash. The
	 * element state sets the wash, and the layer paints it. The composer gives the
	 * layer its position, inset, and radius.
	 */
	before: mode(
		'not-disabled:not-data-disabled:hover:before:bg-zinc-950/5 not-disabled:not-data-disabled:focus:before:bg-zinc-950/5',
		'dark:not-disabled:not-data-disabled:hover:before:bg-white/5 dark:not-disabled:not-data-disabled:focus:before:bg-white/5',
	),
	/**
	 * `base` one step up, for a surface carrying a translucent fill. There `base`
	 * lands at the strength of the fill itself, and the hover only repaints the
	 * rest state. This doubles the `omote.bg.tint` such a surface sits on: 10%
	 * zinc on light, 20% white on dark. The hover therefore reads as a step out of
	 * the surface in each mode.
	 *
	 * Pair it with a fill. On bare ground it is merely a heavier `base`; against
	 * `omote.bg.tint` it is the step that token cannot make. A surface with a fill
	 * also needs no glass allowance, so this never carries the group-scoped half
	 * that `glass.base` adds. The caller emits one wash or the other, not both.
	 */
	filled: mode(
		'not-disabled:not-data-disabled:hover:bg-zinc-950/10 not-disabled:not-data-disabled:focus:bg-zinc-950/10',
		'dark:not-disabled:not-data-disabled:hover:bg-white/20 dark:not-disabled:not-data-disabled:focus:bg-white/20',
	),
	/**
	 * The opaque hover step, for an opaque surface: a card, or a row on
	 * `omote.bg.surface`.
	 *
	 * Opaque, where every other wash here is an alpha. A background is replaced,
	 * not layered. A translucent wash over `bg-white` / `dark:bg-zinc-900` does not
	 * darken the card, it *removes* it. Whatever the card was covering then shows
	 * through for as long as the pointer rests on it. So this steps the surface to
	 * a nearby shade instead: `zinc-100` on light, one stop off `zinc-900` on dark.
	 * The surface stays a surface. On light, `zinc-50` is too near white to see:
	 * the contrast is about 1.04:1. `zinc-100` gives about 1.1:1, near the dark step.
	 *
	 * A surface needs no glass allowance either, so this never carries the
	 * group-scoped half that `glass.base` adds; the caller emits one wash or the other.
	 */
	surface: mode(
		'not-disabled:not-data-disabled:hover:bg-zinc-100 not-disabled:not-data-disabled:focus:bg-zinc-100',
		'dark:not-disabled:not-data-disabled:hover:bg-zinc-800 dark:not-disabled:not-data-disabled:focus:bg-zinc-800',
	),
	/**
	 * The wash on an item inside a glass parent, where 5% reads as nothing.
	 * `omote.glass` paints the parent fill.
	 *
	 * `group-data-glass/glass` compiles to `.group\/glass[data-glass] *`. A panel
	 * that opens this cascade must carry the marker class and the attribute
	 * together. The class alone matches nothing.
	 */
	glass: {
		/** `base` at double strength. */
		base: mode(
			'group-data-glass/glass:not-disabled:not-data-disabled:hover:bg-zinc-950/10 group-data-glass/glass:not-disabled:not-data-disabled:focus:bg-zinc-950/10',
			'dark:group-data-glass/glass:not-disabled:not-data-disabled:hover:bg-white/10 dark:group-data-glass/glass:not-disabled:not-data-disabled:focus:bg-white/10',
		),
		/**
		 * `glass.base` on a `::before` layer, the glass partner of `before`. The
		 * composer gives the layer its position, inset, and radius.
		 */
		before: mode(
			'group-data-glass/glass:not-disabled:not-data-disabled:hover:before:bg-zinc-950/10 group-data-glass/glass:not-disabled:not-data-disabled:focus:before:bg-zinc-950/10',
			'dark:group-data-glass/glass:not-disabled:not-data-disabled:hover:before:bg-white/10 dark:group-data-glass/glass:not-disabled:not-data-disabled:focus:before:bg-white/10',
		),
	},
} as const
