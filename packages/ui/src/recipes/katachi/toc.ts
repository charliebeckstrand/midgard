import { ki } from '../ki'
import { sumi } from '../sumi'

export const toc = {
	base: 'text-sm/5',
	list: 'relative flex flex-col border-l border-l-zinc-950/10 dark:border-l-white/10',
	item: 'relative',
	link: {
		base: [
			'relative z-10 block py-1.5 pr-2 transition-colors',
			ki.inset,
			sumi.textMuted,
			'hover:not-data-current:text-zinc-950 dark:hover:not-data-current:text-white',
		],
		current: {
			true: sumi.text,
			false: [],
		},
		defaults: { current: false as const },
	},
	activeIndicator: 'bg-zinc-950 dark:bg-white',
}
