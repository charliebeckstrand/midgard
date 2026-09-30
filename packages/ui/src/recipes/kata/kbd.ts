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
		// In a Button (`data-variant`), the key takes the step of the button, with
		// text and padding that fit in the line of the label, so the key does not
		// make the button taller. Each class selects the key itself, so Chromium
		// tests the rule only against the keys.
		'[&:is([data-variant]>*)]:density-text-[xs,sm,base]',
		'[&:is([data-variant]>*)]:density-px-[1,1.5,1.5]',
		'[&:is([data-variant]>*)]:density-py-[0,0.5,0.5,0.5,0.5]',
	],
	size: mark.size,
})

/** Recipe variant props for {@link Kbd} — the styling axes its kata exposes (`size`), for consumers composing custom slots. */
export type KbdVariants = VariantProps<typeof k>
