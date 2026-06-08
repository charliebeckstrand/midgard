import { defineRecipe } from '../../core/recipe'
import { iro, sen } from '../kiso'

const { text } = iro
const { border } = sen

// Cell padding keyed by density; text is fixed at `text-base`.
const cellDensity = {
	sm: 'px-1 py-1',
	md: 'px-2 py-2',
	lg: 'px-3 py-3',
}

const grid = {
	true: border.subtle,
	false: '',
}

const cell = defineRecipe({
	base: [text.default],
	density: cellDensity,
	grid,
	defaults: { density: 'md', grid: false },
})

const header = defineRecipe({
	base: ['font-bold', text.muted],
	density: cellDensity,
	grid,
	defaults: { density: 'md', grid: false },
})

export const k = {
	base: 'w-full text-left text-base',
	head: [text.muted, border.subtleColor],
	header,
	row: [],
	cell,
	striped: ['*:even:bg-zinc-950/2.5', 'dark:*:even:bg-white/2.5'],
	empty: ['text-center', text.muted],
}
