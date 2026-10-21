/**
 * The control group: the shared structure of the framed controls. Textarea
 * extends `control`. Input and the field of FileUpload extend `input`, a
 * control with a single-line field. A `trigger` is a control that opens a floating
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
import { hannou, iro, ji, narabi, omote, sou, ugoki } from '../../kiso'
import { affix } from './affix'
import { density } from './density'
import { frame } from './frame'
import { reset } from './reset'
import { surface } from './surface'

export { scale } from './density'

const { cursor } = hannou
const { fit } = narabi

export const control = defineGroup({
	base: frame,
	/**
	 * The surface of the frame. `default` fills it. `outline` has no fill,
	 * and the frame draws only its ring. `glass` is the surface inside a
	 * glass overlay.
	 */
	variant: { default: surface.default, outline: [], glass: surface.glass },
	slots: {
		field: [...reset, ...density],
		prefix: [...affix.base, ...affix.prefix],
		suffix: [...affix.base, ...affix.suffix],
	},
	defaults: { variant: 'default' },
})

/**
 * A control that takes text in a single-line field. The frame can hold a
 * prefix and a suffix.
 */
export const input = defineGroup({
	extends: control,
	/**
	 * The frame: its layout when a prefix or a suffix is present. The frame
	 * has the step of the control, so `ji.ramp` gives it the text size of
	 * the input. Text in an affix, such as the brand of a CreditCardInput,
	 * inherits that size. The slot is a scope one step below the control, so
	 * `ji.ramp` on the slot gives a smaller size. At `md` the text is
	 * `text-base`.
	 *
	 * The frame keeps the input and its affixes on one row, so a narrow host
	 * cannot move the steppers of a NumberInput below the input. In a narrow
	 * host, the prefix and the input shrink, and then the frame overflows.
	 *
	 * The one other layout is for a TagInput with `wrap` that holds tags
	 * (`data-wrap` on its `data-slot="tags"` list). It is here because only
	 * the frame can place its children. The frame is then a grid. The tags
	 * fill the first cell, and the add button stays at the end of the first
	 * row. The text input takes the full row below the tags. The box of the
	 * add button aligns it with the first row of tags (`add` of the TagInput
	 * kata).
	 */
	affixed: {
		true: [
			'group/control flex items-center',
			'has-[[data-slot=tags][data-wrap]]:grid',
			'has-[[data-slot=tags][data-wrap]]:grid-cols-[minmax(0,1fr)_auto]',
			'has-[[data-slot=tags][data-wrap]]:*:data-[slot=suffix]:col-start-2',
			'has-[[data-slot=tags][data-wrap]]:*:data-[slot=suffix]:row-start-1',
			'has-[[data-slot=tags][data-wrap]]:*:data-[slot=suffix]:self-start',
			'has-[[data-slot=tags][data-wrap]]:[&>input]:col-span-2',
			ji.ramp,
		],
		false: [],
	},
	slots: {
		field: 'block',
		/**
		 * A prefix or a suffix. It has no gap, so two controls in it touch, such
		 * as a clear button and the calendar button of a date input. Then each
		 * hit area keeps to the width of its control (`TouchTarget`). One control
		 * alone keeps the full floor. `prefix` and `suffix` add the padding of
		 * the slot on each side.
		 *
		 * The suffix holds controls, such as the steppers of a NumberInput or the
		 * add button of a TagInput, so it does not shrink. In a narrow frame, the
		 * prefix and the input shrink.
		 */
		prefix: 'has-[>*+*]:[--touch-target-gap-x:0px]',
		suffix: ['has-[>*+*]:[--touch-target-gap-x:0px]', 'shrink-0'],
	},
	defaults: { affixed: false },
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
		prefix: press,
		suffix: press,
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
			options: ['max-h-80', fit.scroll],
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
