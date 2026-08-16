/**
 * Panel archetype: the drag grip. Shared by drawer and sheet.
 *
 * Layer: kiso · Archetype: panel · Concern: grip
 */

import { mode } from '../../../core/recipe'

/** The name the grab area carries, so the bar inside it can read the area's state. */
const GROUP = 'group/grip'

/**
 * The stroke the grip takes when a reader tabs to it.
 *
 * On the bar rather than on the area that holds it. The area is the reach — the
 * drawer's whole width, the sheet's whole height — and a ring drawn around that
 * is a line across the panel that says nothing about what has focus. The bar is
 * the control the reader sees and aims at, so it is the thing to outline.
 *
 * Gated on the area's focus and not the bar's, because the area is what holds
 * the tab stop. A CSS outline rather than a ring, for the reason `sen.focus.ring`
 * gives: one crisp stroke along the radius, with a transparent offset gap that
 * keeps it legible against the panel's own fill.
 */
const FOCUS = [
	'group-focus-visible/grip:outline-2 group-focus-visible/grip:outline-offset-2',
	'group-focus-visible/grip:outline-blue-600',
]

/** The grip's own look, which is the same bar whichever way it lies. */
const BAR = ['rounded-full', ...mode('bg-zinc-950/20', 'dark:bg-white/25'), ...FOCUS]

export const grip = {
	/** Goes on the grab area, so the bar can read the focus the area holds. */
	GROUP,
	/**
	 * The bar the reader sees and aims at, keyed by the line the separator draws
	 * — the same word its `aria-orientation` says, and not the axis it resizes: a
	 * grip standing on the inner edge of a right-hand sheet is vertical and moves
	 * the width.
	 */
	bar: {
		horizontal: ['h-1.5 w-10', ...BAR],
		vertical: ['h-10 w-1.5', ...BAR],
	},
} as const
