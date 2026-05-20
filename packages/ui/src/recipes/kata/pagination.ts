import { defineRecipe, iro, ji, sawari, sen, type VariantPropsOf } from '../../core/recipe'

export const k = defineRecipe({
	base: ['flex items-center list-none', 'gap-xs'],
	slots: {
		nav: [
			'inline-flex items-center justify-center',
			'p-2',
			'gap-xs',
			ji.size.sm,
			...iro.text.muted,
			...iro.text.hover,
			'font-medium',
			sen.focus.ring,
			...sawari.disabled,
			...sawari.cursor,
			'rounded-lg',
		],
	},
})

export const paginationList = defineRecipe({
	base: ['flex items-center list-none', 'gap-xs', 'm-0 p-0'],
})

export const pageButton = defineRecipe({
	base: [
		'relative',
		'inline-flex items-center justify-center',
		'min-w-9',
		'p-2',
		ji.size.sm,
		'font-medium',
		'rounded-lg',
		sen.focus.ring,
		...sawari.cursor,
	],
	current: {
		true: [...iro.text.default],
		false: [...iro.text.muted, ...iro.text.hover],
	},
	defaults: { current: false },
})

export const paginationGap = defineRecipe({
	base: [
		'inline-flex items-center justify-center',
		'min-w-9',
		ji.size.sm,
		...iro.text.muted,
		'select-none',
	],
})

export type PageButtonVariants = VariantPropsOf<typeof pageButton>
