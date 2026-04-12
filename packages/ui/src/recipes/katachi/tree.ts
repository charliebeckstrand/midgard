import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'

export const tree = {
	root: '',
	itemContent: [
		'flex w-full items-center gap-1.5 py-1 px-2 text-sm/6',
		sumi.text,
		maru.rounded,
		ki.ring,
		'hover:bg-zinc-950/5 dark:hover:bg-white/5',
	],
	chevron: 'flex-none transition-transform duration-150',
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
}
