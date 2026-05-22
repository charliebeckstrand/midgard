import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { hannou, iro, ji, sen } from '../kiso'

const list = defineRecipe({
	base: ['flex items-center list-none', 'gap-xs', 'm-0 p-0'],
})

const pageButton = defineRecipe({
	base: [
		'relative',
		'inline-flex items-center justify-center',
		'min-w-9',
		'p-2',
		ji.sm,
		'font-medium',
		'rounded-lg',
		sen.focus.ring,
		...hannou.cursor,
	],
	current: {
		true: [...iro.text.default],
		false: [...iro.text.muted, ...iro.text.hover],
	},
	defaults: { current: false },
})

const gap = defineRecipe({
	base: [
		'inline-flex items-center justify-center',
		'min-w-9',
		ji.sm,
		...iro.text.muted,
		'select-none',
	],
})

export const k = defineRecipe(
	{
		base: ['flex items-center list-none', 'gap-xs'],
	},
	{
		list,
		pageButton,
		gap,
	},
)

export type PageButtonVariants = VariantPropsOf<typeof pageButton>
