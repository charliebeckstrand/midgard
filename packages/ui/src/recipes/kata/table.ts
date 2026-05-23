import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { iro, sen } from '../kiso'

const cellSize = {
	sm: 'px-1 py-1',
	md: 'px-2 py-2',
	lg: 'px-3 py-3',
}

const grid = {
	true: ['border', sen.borderSubtleColor],
	false: '',
}

const cell = defineRecipe({
	base: [iro.text.default],
	size: cellSize,
	grid,
	defaults: { size: 'md', grid: false },
})

const header = defineRecipe({
	base: ['font-bold', iro.text.muted],
	size: cellSize,
	grid,
	defaults: { size: 'md', grid: false },
})

export const k = {
	base: 'w-full text-left text-base',
	head: [iro.text.muted, sen.borderSubtleColor],
	header,
	row: [],
	cell,
	striped: ['*:even:bg-zinc-950/2.5', 'dark:*:even:bg-white/2.5'],
	empty: ['text-center', iro.text.muted],
}

export type TableCellVariants = VariantPropsOf<typeof cell>
export type TableHeaderVariants = VariantPropsOf<typeof header>
