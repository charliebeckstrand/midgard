import { defineRecipe, iro, sen, type VariantPropsOf } from '../../core/recipe'

const cellSize = {
	sm: 'px-xs py-xs',
	md: 'px-sm py-sm',
	lg: 'px-md py-md',
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
}

export type TableCellVariants = VariantPropsOf<typeof cell>
export type TableHeaderVariants = VariantPropsOf<typeof header>
