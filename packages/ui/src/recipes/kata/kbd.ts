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
		// A key is never narrower than it is tall, as a key of a keyboard. A key
		// with one glyph is thus a square, and a key with a longer label grows. Its
		// height is the line of the key text and its block padding (`--kbd-py`).
		dan.space.kbd.y,
		dan.space.kbd.button.py,
		'min-w-[calc(1lh+2*var(--kbd-py))]',
		// An icon takes the line height, so a key with only an icon is as tall as a
		// key with text. A key with only icons (`icons-only`, which allows an
		// `sr-only` name) takes its block padding as its inline padding, so a key
		// with one icon is a square too.
		'*:data-[slot=icon]:size-[1lh]',
		// A key with only an icon has no text, so it has no baseline, and a line of
		// text puts its bottom edge on the baseline. An empty glyph gives it the
		// baseline of a key with text, so the two keys line up.
		'icons-only:baseline-strut',
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
