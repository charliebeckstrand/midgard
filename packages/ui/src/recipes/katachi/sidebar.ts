import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { sen } from '../sen'

export const sidebar = {
	base: ['overflow-y-auto overscroll-none', 'flex flex-col gap-y-4', 'h-full', 'px-4 py-6'],
	item: [
		...sawari.navItem,
		'group relative',
		'flex w-full items-center',
		kumi.gap.md,
		'px-2 py-2',
		maru.rounded,
		ji.size.md,
		'text-left font-medium',
		sawari.cursor,
	],
	section: ['flex flex-col', kumi.gap.xs],
	label: ['truncate'],
	header: ['flex items-center', kumi.gap.md],
	body: ['overflow-y-auto', 'flex flex-1 flex-col', kumi.gap.base],
	divider: sen.divider,
	footer: ['sticky bottom-0', 'flex flex-col', kumi.gap.xs, 'mt-auto'],
}
