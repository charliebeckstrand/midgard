import { defineRecipe, type VariantProps } from '../../core/recipe'
import { shaku } from '../kiso'

const { mark } = shaku

// `w-fit` holds the key at its glyph width. A flex or grid parent stretches its
// items across the cross axis by default, which widens the bare `inline-flex`
// box to the full container.
export const k = defineRecipe({
	base: ['inline-flex w-fit items-center justify-center', ...mark.base],
	size: mark.size,
	defaults: { size: 'md' },
})

/** Recipe variant props for {@link Kbd} — the styling axes its kata exposes (`size`), for consumers composing custom slots. */
export type KbdVariants = VariantProps<typeof k>
