/**
 * Panel archetype: slot layout. Shared by dialog, sheet, drawer, and panel.
 *
 * Slot gaps come from the gap of `base`, not per-slot `mt-*`; slots
 * compose in any order. `gap` (vs `space-y`) survives `display: contents`
 * wrappers like Form/Fieldset, keeping the flex-shrink chain to the
 * body's overflow intact. `header` is the optional tight-gap wrapper for
 * title + description; everything else stands on its own at the `lg` stop of
 * the gap scale. The gaps and the inset at each edge (`inset`) follow density.
 * The inset is the same on the four sides.
 *
 * Layer: kiso · Archetype: panel · Concern: layout
 */

import { dan } from '../dan'
import { iro } from '../iro'
import { ji } from '../ji'

const { text } = iro
const { size, leading } = ji
const { scale } = dan.gap

export const layout = {
	base: `flex flex-col ${scale.lg}`,
	gap: {
		/**
		 * Cancels `base`'s gap for a child that is the panel's own edge rather than one
		 * of its slots — a drag handle above the header.
		 *
		 * The ramp of `dan.space.panel.flush` is the negative of the gap of `base` at
		 * each step. If one ramp changes and the other does not, the difference is
		 * dead space that no test finds.
		 */
		flush: dan.space.panel.flush,
		/**
		 * Puts the gap of `base` above a child that follows a sibling. A list in the
		 * body uses it to keep the rhythm of the panel slots. The groups of a command
		 * palette below its search input are an example.
		 *
		 * The ramp of `dan.space.panel.above` is the gap of `base`, for the reason
		 * that `gap.flush` gives.
		 */
		above: dan.space.panel.above,
	},
	/**
	 * The inset of a panel: the space between an edge and the slot next to it. It
	 * is the same on the four sides, so the panel has one even frame. It is larger
	 * than the gap of `base` at each step, so the slots read as one group in the
	 * frame. It takes the step of the nearest density scope, as the content of the
	 * panel does. The ramps are in `dan.space.panel`.
	 *
	 * The inset stops at the box of the content at the edge. A button at the edge
	 * of a footer must show its box, or its padding adds to the inset. Thus the
	 * standard close button of a panel is `soft`, not `plain`.
	 */
	inset: dan.space.panel,
	/** Optional wrapper around title + description for the tighter `sm` gap; sits outside the body's overflow container. */
	header: `flex flex-col ${scale.sm}`,
	/** Color, leading, and the balanced wrap of a heading (`kata/heading.ts`) only; weight and font size are derived from the heading scale by the Title component. */
	title: [...text.default, leading.none, '[text-wrap-style:balance]'],
	description: [...text.muted, size.md, leading.tight],
	/** Optional wrapper around body + footer; a Form or similar can wrap both while preserving the panel's slot rhythm. */
	content: `flex flex-col min-h-0 ${scale.lg}`,
	body: [...text.muted, 'min-h-0 overflow-y-auto overscroll-contain'],
	footer: ['flex items-center justify-end', scale.sm],
} as const
