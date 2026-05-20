import { defineRecipe, hannou, iro, ji, sen, type VariantPropsOf } from '..'

export const tabIndicator = ['bg-zinc-950', 'dark:bg-white']

const list = defineRecipe({
	base: ['flex', ...sen.borderSubtleColor],
	orientation: {
		horizontal: ['gap-4', 'border-b'],
		vertical: ['flex-col', 'border-l'],
	},
	defaults: { orientation: 'horizontal' },
})

const tab = defineRecipe({
	base: [
		'relative flex items-center',
		'gap-sm',
		'font-medium',
		...iro.text.tab,
		sen.focus.indicator,
		...hannou.disabled,
		'outline-none',
		...hannou.cursor,
		'after:absolute after:rounded-full',
		'after:bg-transparent',
		'focus-visible:after:bg-blue-500',
	],
	orientation: {
		horizontal: ['after:inset-x-0 after:-bottom-px after:h-0.5'],
		vertical: ['after:inset-y-0 after:-left-px after:w-0.5'],
	},
	size: {
		sm: ji.sm,
		md: ji.md,
		lg: ji.lg,
	},
	compound: [
		{ orientation: 'horizontal', size: 'sm', class: 'px-1 pb-3' },
		{ orientation: 'horizontal', size: 'md', class: 'px-1 pb-4' },
		{ orientation: 'horizontal', size: 'lg', class: 'px-1 pb-5' },
		{ orientation: 'vertical', size: 'sm', class: 'px-3 py-1.5' },
		{ orientation: 'vertical', size: 'md', class: 'px-4 py-2' },
		{ orientation: 'vertical', size: 'lg', class: 'px-5 py-2.5' },
	],
	defaults: { orientation: 'horizontal', size: 'md' },
})

const indicator = defineRecipe({
	base: ['rounded-full', ...tabIndicator],
	orientation: {
		horizontal: 'inset-x-0 -bottom-px top-auto h-0.5',
		vertical: 'inset-y-0 -left-px right-auto w-0.5',
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	list,
	tab,
	indicator,
}

export type TabListVariants = VariantPropsOf<typeof list>
export type TabVariants = VariantPropsOf<typeof tab>
export type TabIndicatorVariants = VariantPropsOf<typeof indicator>
