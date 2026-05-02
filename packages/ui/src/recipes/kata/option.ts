import { iro } from '../ryu/iro'
import { narabi } from '../ryu/narabi'
import { sawari } from '../ryu/sawari'

export const option = {
	base: [
		'group/option grid w-full items-baseline',
		'grid-cols-[1fr_--spacing(5)] sm:grid-cols-[1fr_--spacing(4)]',
		'px-2',
		'gap-sm',
		'rounded-lg',
		sawari.item,
		'data-active:bg-zinc-950/5',
		'dark:data-active:bg-white/5',
		[
			'group-data-editing/combobox:only-of-type:bg-zinc-950/5',
			'dark:group-data-editing/combobox:only-of-type:bg-white/5',
		],
	],
	content: ['flex min-w-0 items-center', narabi.item],
	label: 'truncate group-data-selected/option:font-bold',
	description: [narabi.description, iro.text.muted],
}
