import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'

export const commandPalette = {
	group: 'py-1 first:pt-0 last:pb-0',
	heading: ['p-2', take.text.xs, sumi.textMuted, 'font-medium'],
	item: [
		'group/option flex w-full items-center',
		'px-2',
		take.gap.md,
		...sawari.item,
		...narabi.item,
		'data-active:bg-zinc-950/5',
		'dark:data-active:bg-white/5',
	],
	label: 'truncate',
	description: [narabi.description, take.text.xs, sumi.textMuted],
	shortcut: 'ml-auto',
}
