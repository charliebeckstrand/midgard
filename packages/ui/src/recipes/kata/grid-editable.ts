import { defineRecipe } from '../../core/recipe'
import { iro, sen } from '../kiso'

const { text } = iro
const { focus } = sen

const cell = defineRecipe({
	base: [
		'relative flex h-full w-full items-center cursor-cell select-none outline-none',
		'px-2',
		'py-2',
		focus.inset,
		'data-[active]:bg-blue-500/10 data-[in-range]:bg-blue-500/10',
		'dark:data-[active]:bg-blue-400/15 dark:data-[in-range]:bg-blue-400/15',
	],
	align: {
		left: 'justify-start text-left',
		center: 'justify-center text-center',
		right: 'justify-end text-right',
	},
	defaults: { align: 'left' },
})

const editInput = defineRecipe({
	base: ['absolute inset-0 bg-transparent', focus.inset, 'px-2', 'py-2', text.default],
	align: {
		left: 'text-left',
		center: 'text-center',
		right: 'text-right',
	},
	defaults: { align: 'left' },
})

export const k = {
	cellTd: 'relative p-0 align-middle',
	cell,
	cellActive: [
		'after:pointer-events-none after:absolute after:inset-0',
		'after:ring-2 after:ring-inset after:ring-blue-600',
		'dark:after:ring-blue-500',
	],
	cellReadOnly: ['cursor-default', text.muted],
	cellFlash: [
		'pointer-events-none absolute inset-0',
		'bg-amber-400/40 dark:bg-amber-500/30',
		'motion-reduce:hidden',
		'motion-safe:animate-[grid-editable-cell-flash_700ms_ease-out_forwards]',
	],
	editInput,
}
