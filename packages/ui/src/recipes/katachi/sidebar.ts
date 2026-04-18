import { kage } from '../kage'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { take } from '../take'

export const sidebar = {
	base: ['overflow-y-auto overscroll-none', 'flex flex-col gap-y-4', 'h-full', 'px-4 py-6'],
	item: [
		...sawari.navItem,
		'group relative',
		'flex w-full items-center',
		take.gap.md,
		'px-2 py-2',
		maru.rounded,
		take.text.md,
		'text-left font-medium',
		sawari.cursor,
	],
	section: ['flex flex-col', take.gap.xs],
	label: ['truncate'],
	header: ['flex items-center', take.gap.md],
	body: ['overflow-y-auto', 'flex flex-1 flex-col', take.gap.base],
	divider: kage.divider,
	footer: ['sticky bottom-0', 'flex flex-col', take.gap.xs, 'mt-auto'],
}
