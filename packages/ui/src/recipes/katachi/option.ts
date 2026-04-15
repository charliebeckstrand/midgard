import { maru } from '../maru'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'

export const option = {
	base: [
		'group/option grid w-full items-baseline gap-x-2',
		maru.rounded,
		sawari.cursor,
		sawari.item,
		'data-active:bg-zinc-950/5 dark:data-active:bg-white/5',
		[
			'group-data-editing/combobox:only-of-type:bg-zinc-950/5',
			'dark:group-data-editing/combobox:only-of-type:bg-white/5',
		],
	],
	check: [
		'grid-cols-[1fr_--spacing(5)] sm:grid-cols-[1fr_--spacing(4)]',
		'pr-2 pl-3.5 sm:pr-2 sm:pl-3',
	],
	content: ['flex min-w-0 items-center', narabi.item],
	label: 'ml-2.5 first:ml-0 sm:ml-2 sm:first:ml-0 truncate',
	description: [narabi.description, sumi.textMuted, sawari.focusText],
}
