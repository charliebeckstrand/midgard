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
	/** The surface of the control: `default` fills it, and `outline` draws a border with no fill. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}
