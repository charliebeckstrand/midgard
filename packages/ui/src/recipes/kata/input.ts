import type { VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { ji } from '../kiso'
import { control } from '../kiso/control'

export const k = bridge.control(control, {
	base: 'block',
	slots: {
		/**
		 * ControlFrame layout when a prefix/suffix affix is present. The frame
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
		frame: [
			'group/control flex items-center',
			'has-[[data-slot=tags][data-wrap]]:grid',
			'has-[[data-slot=tags][data-wrap]]:grid-cols-[minmax(0,1fr)_auto]',
			'has-[[data-slot=tags][data-wrap]]:*:data-[slot=suffix]:col-start-2',
			'has-[[data-slot=tags][data-wrap]]:*:data-[slot=suffix]:row-start-1',
			'has-[[data-slot=tags][data-wrap]]:*:data-[slot=suffix]:self-start',
			'has-[[data-slot=tags][data-wrap]]:[&>input]:col-span-2',
			ji.ramp,
		],
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
		affix: {
			base: [...control.affix.base, 'has-[>*+*]:[--touch-target-gap-x:0px]'],
			prefix: control.affix.prefix,
			suffix: [...control.affix.suffix, 'shrink-0'],
		},
	},
})

/** Recipe variant props for {@link Input}: the styling axes its kata exposes, for consumers composing custom slots. */
export type InputVariants = Omit<VariantProps<typeof k>, 'variant'> & {
	/** The surface of the control: `default` fills it, and `outline` draws a border with no fill. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
