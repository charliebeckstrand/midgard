import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'

export const commandPalette = {
	group: 'py-1 first:pt-2 last:pb-2',
	heading: [sumi.textMuted, 'px-3 pb-1 pt-1 text-xs/5 font-medium'],
	item: [
		'group/option flex w-full items-center gap-3 px-3',
		...sawari.item,
		...narabi.item,
		'data-active:bg-zinc-950/5 dark:data-active:bg-white/5',
	],
	label: 'truncate',
	description: [narabi.description, sumi.textMuted, 'text-xs/5'],
	shortcut: 'ml-auto',
}
