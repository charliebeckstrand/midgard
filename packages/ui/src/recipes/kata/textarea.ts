import type { VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kokkaku, sen } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'

const { textarea } = kokkaku
const { border } = sen

export const k = bridge.control(control, {
	base: ['block', 'min-h-10'],
	resize: {
		none: 'resize-none',
		vertical: 'resize-y',
		horizontal: 'resize-x',
	},
	slots: {
		/** Strips textarea chrome when nested inside a framed container. */
		bare: ['border-0', 'rounded-none', 'focus:outline-hidden'],
		/**
		 * ControlFrame border when an actions slot is present. The frame also
		 * stacks the field above its actions row.
		 */
		frame: [...border.default, 'flex-col items-stretch'],
		/**
		 * Right-justified actions row beneath the textarea. Its gap also caps the
		 * hit areas of the actions (`TouchTarget`), so they do not overlap.
		 */
		actions: [
			'flex items-center justify-end mt-auto',
			dan.gap.scale.sm,
			'pr-2 pb-2',
			...dan.gap.touch.x.sm,
		],
	},
	defaults: { resize: 'none' },
	skeleton: textarea,
})

/** Recipe variant props for {@link Textarea} — the styling axes its kata exposes (`resize`), for consumers composing custom slots. */
export type TextareaVariants = Omit<VariantProps<typeof k>, 'resize' | 'variant'> & {
	/** The axis on which the reader can resize the field. `none` keeps the size fixed. @defaultValue 'none' */
	resize?: VariantProps<typeof k>['resize']
	/** The surface of the control: `default` fills it, and `outline` draws a border with no fill. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
