import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { kumi } from '../ryu/kumi'
import { narabi } from '../ryu/narabi'
import { sawari } from '../ryu/sawari'

export const commandPalette = {
	group: 'py-1 first:pt-0 last:pb-0',
	heading: ['p-2', ji.size.xs, iro.text.muted, 'font-medium'],
	item: [
		'group/option flex w-full items-center',
		'px-2',
		kumi.gap.md,
		...sawari.item,
		...narabi.item,
		'data-active:bg-zinc-950/5',
		'dark:data-active:bg-white/5',
	],
	label: 'truncate',
	description: [narabi.description, ji.size.xs, iro.text.muted],
	shortcut: 'ml-auto',
}
