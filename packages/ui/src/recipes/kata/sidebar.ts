import { tv } from 'tailwind-variants'
import { ji } from '../ryu/ji'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { take } from '../ryu/take'

const sidebarItem = tv({
	base: [
		...sawari.nav,
		...sawari.cursor,
		'group relative',
		'flex w-full items-center',
		'text-left font-medium',
		'rounded-lg',
	],
	variants: {
		size: {
			sm: [ji.size.sm, 'gap-xs', 'p-1.5', take.icon.sm],
			md: [ji.size.md, 'gap-sm', 'p-2', take.icon.md],
			lg: [ji.size.lg, 'gap-md', 'p-2.5', take.icon.lg],
		},
	},
	defaultVariants: { size: 'md' },
})

export const sidebar = {
	base: ['overflow-y-auto', 'flex flex-col gap-y-4', 'h-full', 'py-6', 'px-4'],
	item: sidebarItem,
	section: ['flex flex-col', 'gap-0.5'],
	label: ['truncate'],
	header: ['flex items-center justify-between', 'gap-sm', '**:data-[slot=heading]:leading-none'],
	body: ['overflow-y-auto', 'flex flex-1 flex-col', 'gap-lg'],
	divider: sen.divider,
	footer: ['sticky bottom-0', 'flex flex-col', 'gap-0.5', 'mt-auto'],
}

export { sidebar as k, sidebarItem as sidebarItemVariants }
