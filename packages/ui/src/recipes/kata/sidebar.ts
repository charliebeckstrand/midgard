import { tv } from 'tailwind-variants'
import { ji } from '../ryu/ji'
import { kumi } from '../ryu/kumi'
import { maru } from '../ryu/maru'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

const sidebarBase = tv({
	base: ['overflow-y-auto', 'flex flex-col gap-y-4', 'h-full', 'py-6'],
	variants: {
		mini: {
			false: 'px-4',
			true: 'pl-4 pr-2',
		},
	},
	defaultVariants: {
		mini: false,
	},
})

export const sidebar = {
	base: sidebarBase,
	item: [
		...sawari.nav,
		'group relative',
		'flex w-full items-center',
		'cursor-pointer',
		kumi.gap.md,
		'p-2',
		maru.rounded.lg,
		ji.size.md,
		'text-left font-medium',
	],
	section: ['flex flex-col', kumi.gap.xs],
	label: ['truncate'],
	header: ['flex items-center', kumi.gap.md],
	body: ['overflow-y-auto', 'flex flex-1 flex-col', kumi.gap.base],
	divider: sen.divider,
	footer: ['sticky bottom-0', 'flex flex-col', kumi.gap.xs, 'mt-auto'],
}
