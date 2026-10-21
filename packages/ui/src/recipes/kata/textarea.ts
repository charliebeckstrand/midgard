import { defineKata, type VariantProps } from '../../core/recipe'
import { kokkaku, sen } from '../kiso'
import { dan } from '../kiso/dan'
import { control } from '../kumi/control'

export { scale } from '../kumi/control'

const { textarea } = kokkaku
const { border } = sen

export const k = defineKata(
	{
		extends: control,
		/**
		 * The frame when an actions row is present: it draws the border, and
		 * it stacks the field above the actions row.
		 */
		actions: { true: [...border.default, 'flex-col items-stretch'], false: [] },
		slots: {
			field: {
				base: ['block', textarea.floor],
				resize: {
					none: 'resize-none',
					vertical: 'resize-y',
					horizontal: 'resize-x',
				},
				/** Strips the chrome of the field when the frame holds an actions row. */
				actions: { true: ['border-0', 'rounded-none', 'focus:outline-hidden'], false: [] },
			},
			/**
			 * Right-justified actions row beneath the textarea. Its gap also caps the
			 * hit areas of the actions (`TouchTarget`), so they do not overlap.
			 */
			actions: [
				'flex items-center justify-end mt-auto',
				dan.gap.scale.sm,
				'pe-2 pb-2',
				dan.gap.touch.x.sm,
			],
		},
		defaults: { resize: 'none', actions: false },
	},
	{ skeleton: textarea },
)

/** Recipe variant props for {@link Textarea}: the styling axes its kata exposes (`resize`), for consumers composing custom slots. */
export type TextareaVariants = Omit<VariantProps<typeof k>, 'resize' | 'variant' | 'actions'> & {
	/** The axis on which the reader can resize the field. `none` keeps the size fixed. @defaultValue 'none' */
	resize?: VariantProps<typeof k>['resize']
	/** The surface of the control: `default` fills it, and `outline` draws a border with no fill. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}
