import { tv } from 'tailwind-variants'
import { iro, ji, mode, sawari, sen } from '../../core/recipe'

export const tabIndicator = mode('bg-zinc-950', 'dark:bg-white')

const tabList = tv({
	base: ['flex', ...sen.borderSubtleColor],
	variants: {
		orientation: {
			horizontal: ['gap-4', 'border-b'],
			vertical: ['flex-col', 'border-l'],
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

const tabItem = tv({
	base: [
		'relative flex items-center',
		'gap-sm',
		'font-medium',
		...iro.text.tab,
		sen.focus.indicator,
		...sawari.disabled,
		'outline-none',
		...sawari.cursor,
		'after:absolute after:rounded-full',
		'after:bg-transparent',
		'focus-visible:after:bg-blue-500',
	],
	variants: {
		orientation: {
			horizontal: ['after:inset-x-0 after:-bottom-px after:h-0.5'],
			vertical: ['after:inset-y-0 after:-left-px after:w-0.5'],
		},
		size: {
			sm: ji.size.sm,
			md: ji.size.md,
			lg: ji.size.lg,
		},
	},
	compoundVariants: [
		{ orientation: 'horizontal', size: 'sm', class: 'px-1 pb-3' },
		{ orientation: 'horizontal', size: 'md', class: 'px-1 pb-4' },
		{ orientation: 'horizontal', size: 'lg', class: 'px-1 pb-5' },
		{ orientation: 'vertical', size: 'sm', class: 'px-3 py-1.5' },
		{ orientation: 'vertical', size: 'md', class: 'px-4 py-2' },
		{ orientation: 'vertical', size: 'lg', class: 'px-5 py-2.5' },
	],
	defaultVariants: { orientation: 'horizontal', size: 'md' },
})

const tabIndicatorBar = tv({
	base: ['rounded-full', tabIndicator],
	variants: {
		orientation: {
			horizontal: 'inset-x-0 -bottom-px top-auto h-0.5',
			vertical: 'inset-y-0 -left-px right-auto w-0.5',
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export const k = {
	list: tabList,
	tab: tabItem,
	indicator: tabIndicatorBar,
}
