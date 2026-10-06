import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe } from '../../core/recipe'
import { shaku } from '../kiso'
import { dan } from '../kiso/dan'

const { mark } = shaku

// The mark holds the key at its glyph width. The key takes the step of its
// nearest density scope, and an explicit `size` makes the key its own scope.
export const k = defineRecipe({
	base: [
		'inline-flex items-center justify-center',
		...mark.base,
		...mark.density,
		// In a Button (`data-variant`), the key has less padding, so the key does
		// not make the button taller. The key text is one step below the label of
		// the button with no change. Each class selects the key itself, so
		// Chromium tests the rule only against the keys.
		dan.space.kbd.button.x,
		dan.space.kbd.button.y,
	],
})

/** The size scale of {@link Kbd}: the steps of the key text and padding. */
export const scale = defineScale(...mark.density)

/** Recipe variant props for {@link Kbd}: the `size` step that the component writes as a density scope. */
export type KbdVariants = { size?: ScaleStep<typeof scale> }
