/**
 * The nav group: the row of a navigation list. The Nav item and the Sidebar
 * item extend it. The root slot is the `<li>` wrapper, and the `button` slot is
 * the inner polymorphic button. The `affix` axis trades the interaction chrome
 * between the two.
 *
 * Affixless, the wrapper is a bare list row with no chrome, and the button
 * carries the full interaction surface: the hover tint and the inset keyboard
 * focus. With an affix, the wrapper goes flex and takes over that surface. The
 * hover tint wraps the whole row, and the keyboard focus of the button projects
 * onto the ring of the row through `:has`. The affix slots thus sit inside the
 * tint and the focus ring, and the button only suppresses the UA outline and
 * flexes to fill the row.
 *
 * The padding is not here. Each unit pads its button with stepped classes, so
 * the row takes the step of the nearest density scope.
 */

import { defineGroup } from '../../../core/recipe'
import { dan, hannou, iro, ji, narabi, sen, shaku } from '../../kiso'

const { cursor, tint } = hannou
const { text } = iro
const { flex, inset } = narabi
const { focus } = sen

/**
 * The box of the button with no padding: the axis, the gap, the text, and the
 * radius. These take the step of the nearest density scope. A skeleton row adds
 * the padding of its unit, so its box matches the box of a real row.
 */
export const box = [flex.row, 'w-full', dan.gap.item, ji.ramp, dan.radius.control]

/**
 * A prefix or a suffix slot, beside the button inside the chrome of the row and
 * above the active indicator. Each slot is a density scope one step below the
 * item (`data-density="slot"`), so a slot icon or a small control takes that
 * step with no projection. `narabi.inset` moves the outer edge of the slot in
 * by the padding of the item at that step.
 */
const affix = ['relative', 'z-10', flex.row, 'shrink-0']

export const nav = defineGroup({
	base: 'group relative list-none',
	affix: {
		true: [flex.row, dan.radius.control, ...tint.hover, ...focus.within.row],
		false: '',
	},
	slots: {
		button: {
			base: [
				'group relative z-10',
				...box,
				// A long press on iOS selects the label text. iOS Safari can select the text in
				// a child of a `select-none` item, so the children also set it. The headless
				// Button of an item drops the `select-none` of the button recipe.
				...text.default,
				'select-none *:select-none',
				...cursor,
				'text-start',
				// The icon takes the step of the nearest density scope. At `md` it is `size-5`.
				...shaku.icon.slot.base,
			],
			affix: {
				true: ['outline-none', 'min-w-0 flex-1'],
				false: [...tint.hover, focus.inset],
			},
		},
		/**
		 * The focus projection for the active indicator inside an affixed row.
		 * Browsers paint the ring of the row beneath the opaque pill of the
		 * indicator, because rings and outlines render with the layer of the
		 * element, under positioned descendants. The focused current row therefore
		 * draws the ring again on the pill.
		 */
		indicator: focus.within.indicator,
		prefix: [...affix, inset.prefix],
		suffix: [...affix, inset.suffix],
	},
	defaults: { affix: false },
})
