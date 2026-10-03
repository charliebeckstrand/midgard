import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe } from '../../core/recipe'
import { shaku } from '../kiso'
import { dan } from '../kiso/dan'

const { mark } = shaku

// `w-fit` holds the key at its glyph width. A flex or grid parent stretches its
// items across the cross axis by default, which widens the bare `inline-flex`
// box to the full container.
//
// The key takes the step of its nearest density scope, and an explicit `size`
// makes the key its own scope.
export const k = defineRecipe({
	base: [
		'inline-flex w-fit items-center justify-center',
		...mark.base,
		...mark.density,
		// In a Button (`data-variant`), the key has less padding, so the key does
		// not make the button taller. The key text is one step below the label of
		// the button with no change. Each class selects the key itself, so
		// Chromium tests the rule only against the keys.
		dan.space.kbdXInButton,
		dan.space.kbdYInButton,
	],
})

/** The size scale of {@link Kbd}: the steps of the key text and padding. */
export const scale = defineScale(dan.text.small, dan.space.markX, dan.space.markY)

/** Recipe variant props for {@link Kbd}: the `size` step that the component writes as a density scope. */
export type KbdVariants = { size?: ScaleStep<typeof scale> }
