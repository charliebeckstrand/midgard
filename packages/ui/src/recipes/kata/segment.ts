import { defineRecipe, hannou, ji, omote, sen, type VariantPropsOf } from '..'

const control = defineRecipe({
	base: ['inline-flex items-center', 'rounded-lg', ...omote.tint],
	size: {
		sm: ['p-0.5', ...'gap-xs'],
		md: ['p-1', ...'gap-sm'],
		lg: ['p-1', ...'gap-md'],
	},
	defaults: { size: 'md' },
})

const item = defineRecipe({
	base: [
		'flex items-center justify-center',
		'font-medium select-none',
		'whitespace-nowrap',
		'rounded-lg',
		sen.focus.indicator,
		sen.focus.ring,
		...hannou.disabled,
		...hannou.cursor,
		'outline-none',
	],
	size: {
		sm: ['px-2.5 py-1', ...ji.xs],
		md: ['px-3 py-1.5', ...ji.sm],
		lg: ['px-4 py-2', ...ji.md],
	},
	defaults: { size: 'md' },
})

const indicator = ['bg-white', 'dark:bg-zinc-600']

export const k = {
	control,
	item,
	indicator,
}

export type SegmentControlVariants = VariantPropsOf<typeof control>
export type SegmentItemVariants = VariantPropsOf<typeof item>
