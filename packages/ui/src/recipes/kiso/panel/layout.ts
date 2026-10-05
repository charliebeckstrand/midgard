/**
 * Panel archetype: slot layout. Shared by dialog, sheet, drawer, and panel.
 *
 * Slot gaps come from `gap-4` on `base`, not per-slot `mt-*`; slots
 * compose in any order. `gap` (vs `space-y`) survives `display: contents`
 * wrappers like Form/Fieldset, keeping the flex-shrink chain to the
 * body's overflow intact. `header` is the optional tight-gap wrapper for
 * title + description; everything else stands on its own at 4.
 * The inset at each edge (`inset`) is 6 on the four sides. The panel thus has
 * one even frame, and the slots inside it are closer to each other.
 *
 * Layer: kiso · Archetype: panel · Concern: layout
 */

import { iro } from '../iro'
import { ji } from '../ji'

const { text } = iro
const { size, leading } = ji

export const layout = {
	base: 'flex flex-col gap-4',
	gap: {
		/**
		 * Cancels `base`'s gap for a child that is the panel's own edge rather than one
		 * of its slots — a drag handle above the header.
		 *
		 * Here, beside the gap it undoes, because the two numbers have to agree and
		 * nothing else would make them. A `gap-4` changed on this line, with a `-mb-4`
		 * left in a kata, is a step of dead space no test would catch.
		 */
		flush: '-mb-4',
		/**
		 * Puts the gap of `base` above a child that follows a sibling. A list in the
		 * body uses it to keep the rhythm of the panel slots. The groups of a command
		 * palette below its search input are an example.
		 *
		 * Here, beside the gap it repeats, for the reason that `gap.flush` gives.
		 */
		above: 'not-first:mt-4',
	},
	/**
	 * The inset of a panel: the space between an edge and the slot next to it. It
	 * is the same on the four sides, so the panel has one even frame. It is larger
	 * than the gap of `base`, so the slots read as one group in the frame.
	 *
	 * The inset stops at the box of the content at the edge. A button at the edge
	 * of a footer must show its box, or its padding adds to the inset. Thus the
	 * standard close button of a panel is `soft`, not `plain`.
	 *
	 * The values of each side are here together, because they must agree.
	 */
	inset: {
		/** The inset at the left edge and at the right edge, on the panel or on each slot. */
		inline: 'px-6',
		/** The inset above the first slot, on the panel or on the slot. */
		top: 'pt-6',
		/** The inset under the last slot, on the panel or on the slot. */
		bottom: 'pb-6',
		/**
		 * The inset of a body that is the first slot. It is a margin, because a padding
		 * in a scrolling body moves out of view with the content.
		 */
		first: 'first:mt-6',
		/** The inset of a body that is the last slot, a margin for the reason that `first` gives. */
		last: 'last:mb-6',
		/**
		 * The bottom inset of a panel on the bottom edge below `sm`, plus the home
		 * indicator inset of a page with `viewport-fit=cover`. Elsewhere the inset of
		 * the home indicator is zero. The `1.5rem` is the length of `pb-6`.
		 */
		safe: 'max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
	},
	/** Optional wrapper around title + description for the tighter 2-unit gap; sits outside the body's overflow container. */
	header: 'flex flex-col space-y-2',
	/** Color and leading only; weight and font size are derived from the heading scale by the Title component. */
	title: [...text.default, leading.none],
	description: [...text.muted, size.md, leading.tight],
	/** Optional wrapper around body + footer; a Form or similar can wrap both while preserving the panel's slot rhythm. */
	content: 'flex flex-col min-h-0 space-y-4',
	body: [...text.muted, 'min-h-0 overflow-y-auto'],
	footer: ['flex items-center justify-end gap-2'],
} as const
