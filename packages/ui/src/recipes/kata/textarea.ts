import { defineKata, type VariantProps } from '../../core/recipe'
import { kokkaku, sen } from '../kiso'
import { multiline } from '../kumi/control'

export { scale } from '../kumi/control'

const { textarea } = kokkaku

export const k = defineKata(
	{
		extends: multiline,
		slots: {
			field: {
				/**
				 * Where the primary pointer is coarse, the grip slot replaces the native
				 * grip. Safari on iOS and iPadOS draws no native grip.
				 */
				resize: {
					none: 'resize-none',
					vertical: 'resize-y pointer-coarse:resize-none',
					horizontal: 'resize-x pointer-coarse:resize-none',
				},
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
		},
		defaults: { resize: 'none' },
	},
	{ skeleton: textarea },
)

/** Recipe variant props for {@link Textarea}: the `resize` and `variant` axes of its kata, for consumers composing custom slots. */
export type TextareaVariants = Omit<VariantProps<typeof k>, 'resize' | 'variant' | 'actions'> & {
	/**
	 * The axis on which the reader can resize the field. `none` keeps the size
	 * fixed. Where the primary pointer is coarse, a touch grip on the bottom edge
	 * or the end edge replaces the native grip.
	 * @defaultValue 'none'
	 */
	resize?: VariantProps<typeof k>['resize']
	/** The surface of the control: `default` fills it, `outline` draws a border with no fill, `soft` fills it with a translucent wash and no border, and `bare` draws neither. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}
