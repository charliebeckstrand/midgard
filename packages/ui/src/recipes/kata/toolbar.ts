import { defineRecipe, omote, sen, type VariantPropsOf } from '..'

const root = defineRecipe({
	base: 'flex items-center',
	orientation: {
		horizontal: 'flex-row flex-wrap gap-1',
		vertical: 'flex-col w-fit gap-1',
	},
	variant: {
		plain: '',
		outline: [...sen.border, 'rounded-lg', 'p-1'],
		solid: [...omote.tint, 'border border-transparent', 'rounded-lg', 'p-1'],
	},
	defaults: { orientation: 'horizontal', variant: 'plain' },
})

const group = defineRecipe({
	base: 'flex items-center',
	orientation: {
		horizontal: 'flex-row gap-0.5',
		vertical: 'flex-col gap-0.5',
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	root,
	group,
}

export type ToolbarVariants = VariantPropsOf<typeof root>
export type ToolbarGroupVariants = VariantPropsOf<typeof group>
