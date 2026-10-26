import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, kokkaku, sen } from '../kiso'
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
				/**
				 * Where the primary pointer is coarse, the grip slot replaces the native
				 * grip. Safari on iOS and iPadOS draws no native grip.
				 */
				resize: {
					none: 'resize-none',
					vertical: 'resize-y pointer-coarse:resize-none',
					horizontal: 'resize-x pointer-coarse:resize-none',
				},
				/** Strips the chrome of the field when the frame holds an actions row. */
				actions: { true: ['border-0', 'rounded-none', 'focus:outline-hidden'], false: [] },
			},
			/**
			 * The touch grip: a bar on the edge that the drag moves, the bottom edge
			 * for `vertical` and the end edge for `horizontal`. It shows only where
			 * the primary pointer is coarse. The bar has the ink of a resize grip.
			 */
			grip: {
				base: [
					'absolute hidden pointer-coarse:block touch-none select-none',
					"after:absolute after:content-['']",
					...sen.grip,
				],
				resize: {
					none: [],
					vertical: [
						'inset-x-0 bottom-0 mx-auto h-4 w-12 cursor-ns-resize',
						'after:inset-x-2 after:bottom-1.5 after:h-[3px]',
					],
					horizontal: [
						'inset-y-0 end-0 my-auto h-12 w-4 cursor-ew-resize',
						'after:inset-y-2 after:end-1.5 after:w-[3px]',
					],
				},
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
	/**
	 * The axis on which the reader can resize the field. `none` keeps the size
	 * fixed. Where the primary pointer is coarse, a touch grip on the bottom edge
	 * or the end edge replaces the native grip.
	 * @defaultValue 'none'
	 */
	resize?: VariantProps<typeof k>['resize']
	/** The surface of the control: `default` fills it, and `outline` draws a border with no fill. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}
