import type { VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { iro, textRamp } from '../kiso'
import { control } from '../kiso/control'

const { text } = iro

export const k = bridge.control(control, {
	base: 'block',
	slots: {
		/**
		 * ControlFrame layout when a prefix/suffix affix is present. The frame
		 * has the step of the control, so `textRamp` gives it the text size of
		 * the input. Text in an affix, such as the brand of a CreditCardInput,
		 * inherits that size. The slot is a scope one step below the control, so
		 * `textRamp` on the slot gives a smaller size. At `md` the text is
		 * `text-base`.
		 */
		frame: ['group/control flex flex-wrap items-center', textRamp],
		/**
		 * A prefix or a suffix. It has no gap, so two controls in it touch, such
		 * as a clear button and the calendar button of a date input. Then each
		 * hit area keeps to the width of its control (`TouchTarget`). One control
		 * alone keeps the full floor.
		 */
		affix: [
			'flex items-center min-w-0',
			'*:data-[slot=icon]:pointer-events-none',
			'has-[>*+*]:[--touch-target-gap-x:0px]',
			...text.muted,
		],
	},
})

/** Recipe variant props for {@link Input} — the styling axes its kata exposes, for consumers composing custom slots. */
export type InputVariants = Omit<VariantProps<typeof k>, 'variant'> & {
	/** The surface of the control: `default` fills it, and `outline` draws a border with no fill. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}

/** The size scale of the control: `sm`, `md`, and `lg`. */
export const scale = control.scale
