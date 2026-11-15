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
 * at the `lg` stop of the gap scale. The gaps follow density. The inset at
 * each edge is `dan.space.panel`, and its doc gives the rule.
 */

import { defineGroup } from '../../../core/recipe'
import { dan, iro, ji, narabi, omote, sen } from '../../kiso'

export { grip } from './grip'

const { text } = iro
const { size } = ji
const { fit, flex } = narabi
const { scale } = dan.gap

/** The column of the slots, at the gap of the slot rhythm. */
export const stack = [flex.col, scale.lg]

export const panel = defineGroup({
	base: ['pointer-events-auto', ...sen.ring.default, stack],
	/**
	 * The surface of the panel: `flat` is opaque, and `glass` is translucent and
	 * blurred. `group/glass` is half of the marker that `hannou.tint.glass` keys
	 * on, and the panel also sets `data-glass`.
	 */
	surface: { flat: omote.panel.axis.flat, glass: ['group/glass', ...omote.panel.axis.glass] },
	slots: {
		backdrop: {
			base: 'absolute inset-0',
			surface: omote.backdrop.axis,
		},
		/**
		 * Optional wrapper around title + description for the tighter `sm` gap, or around
		 * a row such as a title with a close button; sits outside the body's overflow container.
		 */
		header: [flex.col, scale.sm],
		/** Color, leading, and the balanced wrap of a heading (`kata/heading.ts`) only; weight and font size are derived from the heading scale by the Title component. */
		title: [...text.default, 'leading-none', '[text-wrap-style:balance]'],
		description: [...text.muted, size.md, 'leading-tight'],
		/** Optional wrapper around body + footer; a Form or similar can wrap both while preserving the panel's slot rhythm. */
		content: [...fit.column, scale.lg],
		body: [...text.muted, fit.scroll],
		footer: [flex.row, 'justify-end', scale.sm],
	},
	defaults: { surface: 'flat' },
})
