/**
 * The panel group: the shared structure of a panel. Dialog, Drawer, and Sheet
 * extend it, and so does Panel, which gives the default slots of
 * `createPanel`.
 *
 * - `base` is the panel. The `surface` axis sets its fill.
 * - `backdrop` is the full-bleed scrim behind a modal panel. The `surface`
 *   axis sets it too: a glass panel takes a denser scrim.
 * - `header`, `title`, `description`, `content`, `body`, and `footer` are the
 *   slots of the panel.
 *
 * The slot gaps come from the gap of `base`, not from a `mt-*` on each slot,
 * so the slots compose in any order. `gap` (not `space-y`) survives the
 * `display: contents` wrappers of Form and Fieldset, so the flex-shrink chain
 * to the overflow of the body stays intact. `header` is the optional wrapper
 * with the tight gap for the title and the description. Each other slot stands
 * at the `lg` stop of the gap scale. The gaps and the inset at each edge
 * (`inset`) follow density. The inset is the same on the four sides.
 */

import { defineGroup } from '../../../core/recipe'
import { dan, iro, ji, omote } from '../../kiso'

export { grip } from './grip'

const { text } = iro
const { size, leading } = ji
const { scale } = dan.gap

/** The column of the slots, at the gap of the slot rhythm. */
export const stack = `flex flex-col ${scale.lg}`

export const panel = defineGroup({
	base: [...omote.panel.chrome, stack],
	/** The surface of the panel: `flat` is opaque, and `glass` is translucent and blurred. */
	surface: omote.panel.axis,
	slots: {
		backdrop: {
			base: 'absolute inset-0',
			surface: { glass: omote.backdrop.glass, flat: omote.backdrop.base },
		},
		/** Optional wrapper around title + description for the tighter `sm` gap; sits outside the body's overflow container. */
		header: `flex flex-col ${scale.sm}`,
		/** Color, leading, and the balanced wrap of a heading (`kata/heading.ts`) only; weight and font size are derived from the heading scale by the Title component. */
		title: [...text.default, leading.none, '[text-wrap-style:balance]'],
		description: [...text.muted, size.md, leading.tight],
		/** Optional wrapper around body + footer; a Form or similar can wrap both while preserving the panel's slot rhythm. */
		content: `flex flex-col min-h-0 ${scale.lg}`,
		body: [...text.muted, 'min-h-0 overflow-y-auto overscroll-contain'],
		footer: ['flex items-center justify-end', scale.sm],
	},
	defaults: { surface: 'flat' },
})

/** The gaps of a child of a panel that is not a slot. */
export const gap = {
	/**
	 * Cancels the gap of `base` for a child that is the edge of the panel, not
	 * one of its slots: a drag handle above the header.
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
}

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
export const inset = dan.space.panel
