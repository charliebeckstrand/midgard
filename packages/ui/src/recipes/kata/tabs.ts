import { defineRecipe, mode } from '../../core/recipe'
import { segment } from '../katakana'
import { hannou, ji, sen } from '../kiso'

const list = defineRecipe({
	base: ['flex', ...sen.borderSubtleColor],
	orientation: {
		horizontal: ['gap-4', 'border-b'],
		vertical: ['flex-col', 'border-l'],
	},
	defaults: { orientation: 'horizontal' },
})

const tabText = mode(
	[
		'text-zinc-500',
		'data-current:text-zinc-950',
		'not-data-current:not-disabled:hover:text-zinc-700',
	],
	[
		'dark:text-zinc-400',
		'dark:data-current:text-white',
		'dark:not-data-current:not-disabled:hover:text-zinc-200',
	],
)

const tab = defineRecipe({
	base: [
		'relative flex items-center',
		'gap-2',
		'font-medium',
		...tabText,
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
	base: ['rounded-full', 'bg-zinc-950', 'dark:bg-white'],
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
	segment: segment(),
}
