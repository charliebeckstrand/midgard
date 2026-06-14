import { defineRecipe, type VariantProps } from '../../core/recipe'
import { shaku } from '../kiso'

const { mark } = shaku

export const k = defineRecipe({
	base: ['inline-flex items-center justify-center', ...mark.base],
	size: mark.size,
	defaults: { size: 'md' },
})

/** Recipe variant props for {@link Kbd} — the styling axes its kata exposes (`size`), for consumers composing custom slots. */
export type KbdVariants = VariantProps<typeof k>
