/**
 * The item group: the row of a list that the reader picks from. Option, the
 * Menu item, and the CommandPalette item extend it. The root slot is the
 * chrome of the row: its interaction state, its text color, its type size,
 * and its rounded corners. The child slots are the text parts of the row.
 *
 * The padding is not here. Each unit pads its row with stepped classes, so the
 * row takes the step of the nearest density scope. A plain padding class here
 * is outside the density layers, and it wins over the stepped padding.
 */

import { defineGroup } from '../../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../../kiso'

const { active, cursor, disabled, tint } = hannou
const { on, text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { forced } = sen

export const item = defineGroup({
	base: [
		'group/option',
		rounded.lg,
		'outline-hidden',
		text.default,
		size.md,
		forced.text,
		forced.focus,
		disabled.base,
		cursor,
		tint.base,
		tint.glass.base,
		// A list roves its rows with `aria-activedescendant`, so the focus stays on
		// the trigger or the input. The roved row is `data-active`, and this wash
		// marks it.
		...active,
	],
	slots: {
		/** The label of the row, on one line. */
		label: 'truncate',
		/**
		 * A column that stacks the label over its description. It takes the free
		 * width of the row, so a leading icon stays beside it. The column resets the
		 * centered text of a button row, and it removes the spacer of an inline
		 * description, which a column does not need.
		 */
		text: [flex.col, 'min-w-0', 'flex-1', 'text-start', '*:before:hidden'],
		/**
		 * The description of the row. It takes `on.wash.muted`, not `muted`: the
		 * row grounds a hovered or roved row on the tint wash, which `muted` is not
		 * legal over. See `iro/ramp.ts`. A spacer pseudo-element (`before:w-2`)
		 * shrinks before the text truncates, so the ellipsis lands inside the row.
		 */
		description: [
			'flex',
			'flex-1',
			'overflow-hidden',
			'before:w-2 before:min-w-0 before:shrink',
			on.wash.muted,
		],
		/** The keyboard shortcut of the row, at its end. */
		shortcut: 'ms-auto',
	},
})
