import { defineRecipe, type VariantProps } from '../../core/recipe'
import { kasane, narabi, sen } from '../kiso'

const { rounded } = kasane
const { flex } = narabi
const { border } = sen

export const k = defineRecipe({
	base: [flex.row, 'gap-4', 'overflow-x-auto', 'px-4 py-2.5', rounded.lg, 'border'],
	variant: {
		outline: [...border.defaultColor],
		plain: [...border.transparent],
	},
	defaults: { variant: 'outline' },
})

/** Recipe variant props for {@link Navbar}: the `variant` style (`outline` | `plain`). */
export type NavbarVariants = VariantProps<typeof k>
