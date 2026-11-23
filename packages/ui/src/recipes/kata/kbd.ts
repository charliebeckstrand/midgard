import { defineScale, type ScaleStep } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, narabi, shaku } from '../kiso'

const { flex } = narabi
const { mark } = shaku

// The mark holds the key at its glyph width. The key takes the step of its
// nearest density scope, and an explicit `size` makes the key its own scope.
export const k = defineKata({
	base: [
		flex.inline,
		'justify-center',
		...mark.base,
		...mark.density,
		// In a Button (`data-variant`), the key has less padding, so the key does
		// not make the button taller. The key text is one step below the label of
		// the button with no change. Each class selects the key itself, so
		// Chromium tests the rule only against the keys.
		dan.space.kbd.button.x,
		dan.space.kbd.button.y,
		// A key with only icons is a square as tall as a key with text. Its icon
		// takes the line height of the key text, and its inline padding takes the
		// block padding. The component sets `data-has-label` on a key with text.
		'not-data-has-label:*:data-[slot=icon]:size-[1lh]',
		dan.space.kbd.icon.x,
		dan.space.kbd.icon.button.x,
	],
})

/** The size scale of {@link Kbd}: the steps of the key text and padding. */
export const scale = defineScale(...mark.density)

/** Recipe variant props for {@link Kbd}: the `size` step that the component writes as a density scope. */
export type KbdVariants = {
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: ScaleStep<typeof scale>
}
