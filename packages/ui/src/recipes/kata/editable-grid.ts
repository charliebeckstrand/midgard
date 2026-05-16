import { tv } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { sen } from '../ryu/sen'

const editableGridCell = tv({
	base: [
		'relative flex h-full w-full items-center cursor-cell select-none outline-none',
		'px-sm',
		'py-sm',
		sen.focus.inset,
		'data-[active]:bg-blue-500/10 data-[in-range]:bg-blue-500/10',
		'dark:data-[active]:bg-blue-400/15 dark:data-[in-range]:bg-blue-400/15',
	],
	variants: {
		align: {
			left: 'justify-start text-left',
			center: 'justify-center text-center',
			right: 'justify-end text-right',
		},
	},
	defaultVariants: { align: 'left' },
})

const editableGridCellInput = tv({
	base: ['absolute inset-0 bg-transparent', sen.focus.inset, 'px-sm', 'py-sm', iro.text.default],
	variants: {
		align: {
			left: 'text-left',
			center: 'text-center',
			right: 'text-right',
		},
	},
	defaultVariants: { align: 'left' },
})

export const editableGrid = {
	cellTd: 'relative p-0 align-middle',
	cell: editableGridCell,
	cellActive: [
		'after:pointer-events-none after:absolute after:inset-0',
		'after:ring-2 after:ring-inset after:ring-blue-600',
		'dark:after:ring-blue-500',
	],
	cellReadOnly: ['cursor-default', iro.text.muted],
	editInput: editableGridCellInput,
}

export {
	editableGrid as k,
	editableGridCell as editableGridCellVariants,
	editableGridCellInput as editableGridCellInputVariants,
}
