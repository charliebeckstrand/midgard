import { defineRecipe, type VariantProps } from '../../core/recipe'
import { sen } from '../kiso'

const { border } = sen

export const k = defineRecipe({
	base: ['border-0'],
	orientation: {
		horizontal: 'w-full border-t',
		// `h-auto` resets Preflight's `hr { height: 0 }`; without it `self-stretch`
		// has a definite cross-size to stretch from and the rule collapses to 0px.
		vertical: 'h-auto self-stretch border-l',
	},
	soft: {
		true: [...border.subtleColor],
		false: [...border.defaultColor],
	},
	defaults: { orientation: 'horizontal', soft: false },
})

/** Recipe variant props for {@link Divider} — the styling axes its kata exposes (`orientation`, `soft`), for consumers composing custom slots. */
export type DividerVariants = VariantProps<typeof k>
