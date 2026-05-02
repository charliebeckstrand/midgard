import { tv } from 'tailwind-variants'
import { ji } from '../ryu/ji'
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
		'gap-sm',
		'p-2',
		'rounded-lg',
		ji.size.md,
		'text-left font-medium',
	],
	section: ['flex flex-col', 'gap-0.5'],
	label: ['truncate'],
	header: ['flex items-center', 'gap-sm'],
	body: ['overflow-y-auto', 'flex flex-1 flex-col', 'gap-lg'],
	divider: sen.divider,
	footer: ['sticky bottom-0', 'flex flex-col', 'gap-0.5', 'mt-auto'],
}
