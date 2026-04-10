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
			'overflow-hidden divide-y divide-zinc-950/10 dark:divide-white/10',
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
		'flex w-full items-center justify-between gap-3',
		'px-4 py-3 text-left text-sm/6 font-medium',
		sumi.text,
		'not-disabled:hover:bg-zinc-950/[2.5%] dark:not-disabled:hover:bg-white/[2.5%]',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	indicator: [
		'shrink-0 transition-transform duration-200',
		'group-data-[open]/accordion-item:rotate-180',
	],
	panel: 'overflow-hidden',
	body: ['px-4 pb-3 pt-0 text-sm/6', sumi.textMuted],
	defaults: { variant: 'separated' as const },
}
