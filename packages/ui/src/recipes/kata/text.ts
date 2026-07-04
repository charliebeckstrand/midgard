/**
 * Text kata: recipe-shaped surface for `<Text>` with two independent colour
 * axes plus a type scale. `severity` pulls the semantic `iro.text` tokens
 * (default / primary / success / warning / error / muted) and is the
 * meaning-bearing axis; `color` is a separate literal-hue override authored
 * inline with `mode()`. A consumer sets one or the other — severity for status,
 * color for a bespoke tint. `size` steps the type scale (`sm`/`md`/`lg` →
 * `text-sm`/`text-base`/`text-lg`); it has no default, so an unset size leaves
 * Text at its inherited size and existing call sites are unchanged.
 */
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, kokkaku } from '../kiso'

const { text } = iro
const { size } = ji

export const k = defineRecipe({
	severity: {
		default: [...text.default],
		primary: [...text.primary],
		success: [...text.success],
		warning: [...text.warning],
		error: [...text.error],
		muted: [...text.muted],
	},
	color: {
		current: mode('text-current', 'dark:text-current'),
		zinc: mode('text-zinc-600', 'dark:text-zinc-400'),
		red: mode('text-red-600', 'dark:text-red-500'),
		amber: mode('text-amber-500', 'dark:text-amber-400'),
		green: mode('text-green-600', 'dark:text-green-500'),
		blue: mode('text-blue-600', 'dark:text-blue-500'),
	},
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { severity: 'default' },
	skeleton: kokkaku.text,
})

/** Recipe variant props for {@link Text} — the styling axes its kata exposes (`severity`, `color`, `size`), for consumers composing custom slots. */
export type TextVariants = VariantProps<typeof k>
