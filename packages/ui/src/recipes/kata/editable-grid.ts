import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { iro, sen } from '../kiso'

const cell = defineRecipe({
	base: [
		'relative flex h-full w-full items-center cursor-cell select-none outline-none',
		'px-2',
		'py-2',
		sen.focus.inset,
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
	base: ['absolute inset-0 bg-transparent', sen.focus.inset, 'px-2', 'py-2', iro.text.default],
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
	cellReadOnly: ['cursor-default', iro.text.muted],
	editInput,
}

export type EditableGridCellVariants = VariantPropsOf<typeof cell>
export type EditableGridCellInputVariants = VariantPropsOf<typeof editInput>
