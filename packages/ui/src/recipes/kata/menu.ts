import { iro } from '../ryu/iro'
import { narabi } from '../ryu/narabi'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { take } from '../ryu/take'

export const menu = {
	content: ['min-w-48', take.popup],
	item: [
		'group/option flex w-full items-center',
		'gap-3 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
		...sawari.item,
		...narabi.item,
	],
	section: 'first:pt-0 last:pb-0',
	heading: ['px-3.5 pb-1 pt-2 sm:px-3', 'text-xs/5 font-medium', iro.text.muted],
	label: 'truncate',
	description: [narabi.description, iro.text.muted, 'group-focus/option:text-white'],
	shortcut: 'ml-auto',
	separator: sen.divider,
}
