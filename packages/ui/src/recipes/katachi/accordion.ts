import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'

export const accordion = {
	base: 'flex flex-col',
	variant: {
		separated: ['gap-2'],
		bordered: [
			maru.rounded,
			kage.border,
			'divide-y divide-zinc-950/10 dark:divide-white/10',
			'overflow-hidden',
		],
		plain: ['divide-y divide-zinc-950/10 dark:divide-white/10'],
	},
	item: {
		base: 'group/accordion-item',
		separated: [maru.rounded, kage.border, 'overflow-hidden'],
		bordered: '',
		plain: '',
	},
	button: [
		'w-full flex items-center justify-between gap-3',
		'px-4 py-3 text-left',
		'text-sm/6 font-medium',
		sumi.textMuted,
		sumi.textHover,
		'group-data-[open]/accordion-item:text-zinc-950 dark:group-data-[open]/accordion-item:text-white group-data-[open]/accordion-item:cursor-pointer',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	indicator: [
		'shrink-0 transition-transform duration-200',
		'group-data-[open]/accordion-item:rotate-180',
	],
	panel: 'overflow-hidden',
	body: ['px-4 pb-3 pt-0', 'text-sm/6', sumi.textMuted],
	defaults: { variant: 'separated' as const },
}
