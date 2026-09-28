import { defineRecipe, type VariantProps } from '../../core/recipe'
import { shaku } from '../kiso'

const { mark } = shaku

// `w-fit` holds the key at its glyph width. A flex or grid parent stretches its
// items across the cross axis by default, which widens the bare `inline-flex`
// box to the full container.
//
// With no `size`, the key takes the `md` mark under `density-any`. That rank is
// below each step, so a parent that sizes its keys with stepped classes, such
// as Button, wins over the default. An explicit `size` is a plain class and
// wins over both.
export const k = defineRecipe({
	base: [
		'inline-flex w-fit items-center justify-center',
		...mark.base,
		'density-any:text-sm density-any:px-1.5 density-any:py-1',
	],
	size: mark.size,
})

/** Recipe variant props for {@link Kbd} — the styling axes its kata exposes (`size`), for consumers composing custom slots. */
export type KbdVariants = VariantProps<typeof k>
