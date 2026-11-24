/**
 * Input kata: the unit of `<Input>`, which extends the input group. The frame
 * sets `affixed` from its affixes.
 */
import { defineKata, type VariantProps } from '../../core/recipe'
import { input } from '../kumi/control'

export { scale } from '../kumi/control'

export const k = defineKata({ extends: input })

/**
 * Recipe variant props for {@link Input}: the styling axes its kata exposes, for consumers composing custom slots.
 * The frame sets `affixed` from its affixes, so it is not a prop.
 */
export type InputVariants = Omit<VariantProps<typeof k>, 'variant' | 'affixed'> & {
	/** The surface of the control: `default` fills it, `outline` draws a border with no fill, `soft` fills it with a translucent wash and no border, and `bare` draws neither. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
	/**
	 * The width of the control. `fill` takes the width of the container.
	 * `auto` takes the width of the value or the placeholder, and grows with
	 * the value, where the layout does not give a width: in a flex row, or in
	 * a box that fits its content. A block, a stretched flex item, and a grid
	 * cell give their width, so there the control fills.
	 * @defaultValue 'fill'
	 */
	width?: VariantProps<typeof k>['width']
}
