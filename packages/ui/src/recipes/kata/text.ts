import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, kokkaku } from '../kiso'

const { text } = iro

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
	defaults: { severity: 'default' },
	skeleton: kokkaku.text,
})

/** Recipe variant props for {@link Text} — the styling axes its kata exposes (`severity`, `color`), for consumers composing custom slots. */
export type TextVariants = VariantProps<typeof k>
