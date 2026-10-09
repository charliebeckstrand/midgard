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
		 */
		frame: ['group/control flex flex-wrap items-center', ji.ramp],
		/**
		 * A prefix or a suffix. It has no gap, so two controls in it touch, such
		 * as a clear button and the calendar button of a date input. Then each
		 * hit area keeps to the width of its control (`TouchTarget`). One control
		 * alone keeps the full floor. `prefix` and `suffix` add the padding of
		 * the slot on each side.
		 */
		affix: {
			base: [...control.affix.base, 'has-[>*+*]:[--touch-target-gap-x:0px]'],
			prefix: control.affix.prefix,
			suffix: control.affix.suffix,
		},
	},
})

/** Recipe variant props for {@link Input} — the styling axes its kata exposes, for consumers composing custom slots. */
export type InputVariants = Omit<VariantProps<typeof k>, 'variant'> & {
	/** The surface of the control: `default` fills it, and `outline` draws a border with no fill. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
