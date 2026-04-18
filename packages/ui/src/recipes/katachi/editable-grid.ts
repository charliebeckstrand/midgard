import { ki } from '../ki'
import { ma } from '../ma'
import { sumi } from '../sumi'

export const editableGrid = {
	cellTd: 'relative p-0 align-middle',
	cell: [
		'relative flex h-full w-full items-center cursor-cell select-none outline-none',
		ma.density.px.md,
		ma.density.py.md,
		ki.inset,
		'data-[active]:bg-blue-500/10',
		'dark:data-[active]:bg-blue-400/15',
	],
	cellActive: [
		'after:pointer-events-none after:absolute after:inset-0',
		'after:ring-2 after:ring-inset after:ring-blue-600',
		'dark:after:ring-blue-500',
	],
	cellReadOnly: ['cursor-default', sumi.textMuted],
	cellAlign: {
		left: 'justify-start text-left',
		center: 'justify-center text-center',
		right: 'justify-end text-right',
	},
	editInput: ['w-full bg-transparent outline-none', sumi.text],
}
