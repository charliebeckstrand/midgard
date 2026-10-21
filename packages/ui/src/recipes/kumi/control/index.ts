/**
 * The control group: the shared structure of the framed controls. Input and
 * Textarea extend `control`. A `trigger` is a control that opens a floating
 * panel. Listbox and Combobox extend `list`, a trigger that opens a list of
 * options. DatePicker and ColorPicker extend `picker`, a trigger that opens a
 * picker dialog.
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
import { hannou, iro, narabi, omote, sou, ugoki } from '../../kiso'
import { affix } from './affix'
import { density } from './density'
import { frame } from './frame'
import { reset } from './reset'
import { surface } from './surface'

export { scale } from './density'

const { cursor } = hannou
const { fit } = narabi

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

/** A control that opens a floating panel. Its affixes are press targets. */
export const trigger = defineGroup({
	extends: control,
	slots: {
		prefix: { base: press },
		suffix: { base: press },
	},
})

/**
 * A trigger that opens a list of options. The panel rides the `float` rung of
 * the stacking order, which clears every overlay rung, because a list opens
 * from inside a modal panel too.
 */
export const list = defineGroup(
	{
		extends: trigger,
		slots: {
			/**
			 * The scroll region of the options. The cap is 320px, about eight rows. The
			 * old 240px (the classic Tailwind example value, never a reasoned one) forced
			 * a scrollbar at seven options, and the dashboard picker hit it with screen to
			 * spare. The cap binds only on a list that exceeds it. A panel that no longer
			 * fits below its trigger flips above, and a panel that fits on neither side
			 * shrinks into the larger space (the floating middleware chain).
			 */
			options: { base: ['max-h-80', fit.scroll] },
		},
	},
	{
		/** The positioned wrapper of the panel. */
		portal: [sou.float, fit.wrapper],
	},
)

/**
 * A trigger that opens a picker dialog. `root` sizes the box of the trigger to
 * its content. The box does not fill its parent, and it does not get wider
 * than its parent. `content` holds the classes of the dialog panel.
 */
export const picker = defineGroup(
	{ extends: trigger },
	{
		root: ['w-fit', 'max-w-full'],
		content: {
			portal: [sou.float, fit.wrapper],
			motion: ugoki.popover,
			column: fit.column,
			text: iro.text.default,
			glass: omote.glass,
		},
	},
)
