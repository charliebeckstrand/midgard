/**
 * The control group: the shared structure of the framed controls. Input and
 * Textarea extend `control`. Listbox, Combobox, DatePicker, and ColorPicker
 * extend `trigger`, which is a control that opens a picker.
 *
 * - `base` is the frame (`<ControlFrame>`): the kasane chrome, the radius, and
 *   the surface that `variant` sets.
 * - `field` is the element that takes the input or opens the picker.
 * - `prefix` and `suffix` are the affix slots of the frame.
 *
 * Each class is a stepped `density-*` utility where it has a size, so a
 * control takes the step of its nearest density scope.
 */

import { defineGroup } from '../../../core/recipe'
import { hannou } from '../../kiso/hannou'
import { affix } from './affix'
import { density } from './density'
import { frame } from './frame'
import { reset } from './reset'
import { surface } from './surface'

export { scale } from './density'

const { cursor } = hannou

export const control = defineGroup({
	slots: {
		base: {
			base: frame,
			/**
			 * The surface of the frame. `default` fills it. `outline` has no fill,
			 * and the frame draws only its ring. `glass` is the surface inside a
			 * glass overlay.
			 */
			variant: { default: surface.default, outline: [], glass: surface.glass },
		},
		field: { base: [...reset, ...density] },
		prefix: { base: [...affix.base, ...affix.prefix] },
		suffix: { base: [...affix.base, ...affix.suffix] },
	},
	defaults: { variant: 'default' },
})

/**
 * A press target in an affix of a picker trigger. The slot fills the height of
 * the frame, so the whole column of the affix takes a press and shows the
 * pointer cursor. The disabled field is a sibling of the affix, not a
 * descendant, so the cursor reads the enclosing frame.
 */
const press = [
	'self-stretch',
	...cursor,
	'group-has-[:disabled,[data-disabled]]/control:cursor-not-allowed',
]

/** A control that opens a picker. Its affixes are press targets. */
export const trigger = defineGroup({
	extends: control,
	slots: {
		prefix: { base: press },
		suffix: { base: press },
	},
})
