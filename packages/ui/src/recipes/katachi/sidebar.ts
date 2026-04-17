import { kage } from '../kage'
import { maru } from '../maru'
import { sawari } from '../sawari'

export const sidebar = {
	base: [
		'flex flex-col gap-y-4',
		'h-full',
		'px-4 py-6',
		'overflow-y-auto overscroll-none',
	],
	item: [
		...sawari.navItem,
		maru.rounded,
		'group relative',
		'flex w-full items-center gap-3',
		'px-2 py-2',
		'text-left text-sm/5 font-medium',
		sawari.cursor,
	],
	section: 'flex flex-col gap-0.5',
	label: ['truncate'],
	header: 'flex items-center gap-2',
	body: [
		'flex flex-1 flex-col gap-4',
		'overflow-y-auto',
	],
	divider: kage.divider,
	footer: [
		'sticky bottom-0',
		'flex flex-col gap-0.5',
		'mt-auto',
	],
}
