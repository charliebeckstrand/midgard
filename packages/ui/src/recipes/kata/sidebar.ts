import { ji } from '../ryu/ji'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

export const sidebar = {
	base: ['overflow-y-auto', 'flex flex-col gap-y-4', 'h-full', 'py-6', 'px-4'],
	item: [
		...sawari.nav,
		...sawari.cursor,
		'group relative',
		'flex w-full items-center',
		'gap-sm',
		'p-2',
		'rounded-lg',
		ji.size.md,
		'text-left font-medium',
	],
	section: ['flex flex-col', 'gap-0.5'],
	label: ['truncate'],
	header: ['flex items-center justify-between', 'gap-sm'],
	body: ['overflow-y-auto', 'flex flex-1 flex-col', 'gap-lg'],
	divider: sen.divider,
	footer: ['sticky bottom-0', 'flex flex-col', 'gap-0.5', 'mt-auto'],
}

export { sidebar as k }
