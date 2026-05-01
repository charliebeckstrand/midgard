import { tv } from 'tailwind-variants'
import { mode } from '../../core/recipe/mode'
import { iro } from '../ryu/iro'
import { kumi } from '../ryu/kumi'
import { maru } from '../ryu/maru'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

export const tabIndicator = mode('bg-zinc-950', 'dark:bg-white')

const tabList = tv({
	base: ['flex', ...sen.borderSubtleColor],
	variants: {
		orientation: {
			horizontal: ['gap-4', 'border-b', '-mt-4'],
			vertical: ['flex-col', 'border-l'],
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

const tabItem = tv({
	base: [
		'relative flex items-center',
		kumi.gap.md,
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
			horizontal: ['px-1 py-4', 'after:inset-x-0 after:-bottom-px after:h-0.5'],
			vertical: ['px-4 py-2', 'after:inset-y-0 after:-left-px after:w-0.5'],
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

const tabIndicatorBar = tv({
	base: [maru.rounded.full, tabIndicator],
	variants: {
		orientation: {
			horizontal: 'inset-x-0 -bottom-px top-auto h-0.5',
			vertical: 'inset-y-0 -left-px right-auto w-0.5',
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export const tabs = {
	list: tabList,
	tab: tabItem,
	indicator: tabIndicatorBar,
}
